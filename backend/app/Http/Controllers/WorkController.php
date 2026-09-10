<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Work;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
        ]);

        return response()->json(
            Work::where('service_id', $validated['service_id'])->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
            'description' => ['nullable', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
        ]);

        $work = Work::create([
            ...$validated,
            'cost' => $validated['cost'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Work entry saved.',
            'work' => $work,
        ], 201);
    }
}
