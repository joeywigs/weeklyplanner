export default function RecipesPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Recipes</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your family recipe collection. Search, browse, and manage your dinner recipes.
      </p>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search recipes..."
          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[var(--border)] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Recipe management coming soon</p>
          <p className="text-gray-400 text-xs mt-1">
            Add and organize your family&apos;s favorite recipes here
          </p>
        </div>
      </div>
    </div>
  );
}
