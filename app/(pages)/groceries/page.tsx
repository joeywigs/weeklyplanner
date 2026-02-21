export default function GroceriesPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Groceries</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage your grocery items, stores, and shopping preferences.
      </p>

      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Grocery management coming soon</p>
        <p className="text-gray-400 text-xs mt-1">
          Configure your usual items, preferred stores, and product details
        </p>
      </div>
    </div>
  );
}
