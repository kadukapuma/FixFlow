<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Mail\RegistrationOtpMail;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class CompanyRegistrationController extends Controller
{
    /**
     * Subdomains that can never be claimed by a tenant.
     */
    protected const RESERVED_SUBDOMAINS = [
        'www', 'api', 'admin', 'app', 'mail', 'ftp', 'central', 'localhost',
    ];

    protected const OTP_TTL_MINUTES = 10;
    protected const OTP_MAX_ATTEMPTS = 5;

    /**
     * Step 1: validate the whole form up front (so problems like a taken
     * subdomain surface before the user goes to their inbox), then email a
     * one-time code to the owner's address.
     */
    public function sendOtp(Request $request)
    {
        $validated = $request->validate($this->rules());

        $code = (string) random_int(100000, 999999);

        Cache::put($this->otpCacheKey($validated['owner_email']), [
            'hash' => Hash::make($code),
            'attempts' => 0,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        try {
            Mail::to($validated['owner_email'])->send(
                new RegistrationOtpMail($code, $validated['company_name'], self::OTP_TTL_MINUTES)
            );
        } catch (Throwable $e) {
            Log::error('Failed to send registration OTP', [
                'email' => $validated['owner_email'],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Could not send the verification email. Please try again later.',
            ], 503);
        }

        return response()->json([
            'message' => "A verification code was sent to {$validated['owner_email']}.",
        ]);
    }

    /**
     * Step 2: the same form plus the emailed code. The company is only
     * created once the code checks out.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules() + [
            'otp' => ['required', 'digits:6'],
        ]);

        $this->verifyOtp($validated['owner_email'], $validated['otp']);

        $subdomain = Str::lower($validated['subdomain']);

        $company = Company::create([
            'name' => $validated['company_name'],
            'subdomain' => $subdomain,
            'status' => Company::STATUS_PENDING,
            'is_active' => false,

            'owner_name' => $validated['owner_name'],
            'owner_email' => $validated['owner_email'],
            'owner_password' => Hash::make($validated['owner_password']),
            'owner_email_verified_at' => now(),
            'phone' => $validated['owner_mobile'],

            // Tenant databases live on the same MySQL server as the
            // central database; only the database name differs per tenant.
            // MySQL identifiers can't contain "-", but subdomains can
            // (alpha_dash allows it), so normalize dashes to underscores.
            'database_name' => Str::slug(config('app.name'), '_') . '_' . str_replace('-', '_', $subdomain),
            'database_host' => config('database.connections.mysql.host'),
            'database_port' => config('database.connections.mysql.port'),
            'database_username' => config('database.connections.mysql.username'),
            'database_password' => config('database.connections.mysql.password'),
        ]);

        return response()->json([
            'message' => 'Registration received. An administrator will review your request.',
            'company' => $company->only(['id', 'name', 'subdomain', 'status']),
        ], 201);
    }

    private function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required', 'string', 'max:63', 'alpha_dash',
                Rule::notIn(self::RESERVED_SUBDOMAINS),
                Rule::unique('companies', 'subdomain'),
            ],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_mobile' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'owner_password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    private function otpCacheKey(string $email): string
    {
        return 'registration_otp:' . sha1(Str::lower(trim($email)));
    }

    /**
     * Throws a validation error on the "otp" field unless the code matches.
     * A code is single-use and is discarded after too many wrong guesses.
     */
    private function verifyOtp(string $email, string $code): void
    {
        $key = $this->otpCacheKey($email);
        $entry = Cache::get($key);

        if (!$entry) {
            throw ValidationException::withMessages([
                'otp' => ['This code has expired. Please request a new one.'],
            ]);
        }

        if ($entry['attempts'] >= self::OTP_MAX_ATTEMPTS) {
            Cache::forget($key);

            throw ValidationException::withMessages([
                'otp' => ['Too many incorrect attempts. Please request a new code.'],
            ]);
        }

        if (!Hash::check($code, $entry['hash'])) {
            $entry['attempts']++;
            Cache::put($key, $entry, now()->addMinutes(self::OTP_TTL_MINUTES));

            throw ValidationException::withMessages([
                'otp' => ['The verification code is incorrect.'],
            ]);
        }

        Cache::forget($key);
    }
}
