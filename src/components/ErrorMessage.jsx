// src/components/ErrorMessage.jsx
export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-300 px-3 py-2 rounded">
      {message}
    </div>
  );
}
