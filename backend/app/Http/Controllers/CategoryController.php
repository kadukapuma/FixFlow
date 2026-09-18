<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::latest();

        // Pickers (e.g. a category dropdown on the item form) need every
        // category at once, not one page of the table view.
        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique(Category::class, 'name')],
            'description' => ['nullable', 'string'],
        ]);

        $category = Category::create($validated);

        return response()->json([
            'message' => 'Category created successfully.',
            'category' => $category,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique(Category::class, 'name')->ignore($category->id)],
            'description' => ['nullable', 'string'],
        ]);

        $category->update($validated);

        return response()->json([
            'message' => 'Category updated successfully.',
            'category' => $category,
        ]);
    }

    public function destroy(int $id)
    {
        $category = Category::findOrFail($id);

        if (Product::where('category_id', $category->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this category: it is linked to existing products.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $category = Category::findOrFail($id);

        $category->update(['is_active' => true]);

        return response()->json([
            'message' => 'Category activated.',
            'category' => $category,
        ]);
    }

    public function deactivate(int $id)
    {
        $category = Category::findOrFail($id);

        $category->update(['is_active' => false]);

        return response()->json([
            'message' => 'Category deactivated.',
            'category' => $category,
        ]);
    }
}
