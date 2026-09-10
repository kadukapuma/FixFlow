<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(
            Employee::latest()->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'nic' => ['required', 'string', 'max:255', Rule::unique(Employee::class, 'nic')],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'dob' => ['nullable', 'date'],
        ]);

        $employee = Employee::create($validated);

        return response()->json([
            'message' => 'Employee created successfully.',
            'employee' => $employee,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'nic' => ['required', 'string', 'max:255', Rule::unique(Employee::class, 'nic')->ignore($employee->id)],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'dob' => ['nullable', 'date'],
        ]);

        $employee->update($validated);

        return response()->json([
            'message' => 'Employee updated successfully.',
            'employee' => $employee,
        ]);
    }

    public function destroy(int $id)
    {
        $employee = Employee::findOrFail($id);

        if (Service::where('employee_id', $employee->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this employee: they are linked to existing services.',
            ], 409);
        }

        $employee->delete();

        return response()->json([
            'message' => 'Employee deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $employee = Employee::findOrFail($id);

        $employee->update(['is_active' => true]);

        return response()->json([
            'message' => 'Employee activated.',
            'employee' => $employee,
        ]);
    }

    public function deactivate(int $id)
    {
        $employee = Employee::findOrFail($id);

        $employee->update(['is_active' => false]);

        return response()->json([
            'message' => 'Employee deactivated.',
            'employee' => $employee,
        ]);
    }
}
