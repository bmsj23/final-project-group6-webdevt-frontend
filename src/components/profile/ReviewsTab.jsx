import { Link } from "react-router-dom";
import { Star, Edit2, Trash2 } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error caught in ReviewsTab:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <p className="text-red-600">Something went wrong while loading reviews.</p>;
    }
    return this.props.children;
  }
}

const ReviewsTab = ({
  authoredReviews,
  loading,
  error,
  onEditReview,
  onDeleteReview
}) => {
  // Defensive default: ensure authoredReviews is always an array
  const safeReviews = Array.isArray(authoredReviews) ? authoredReviews : [];

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (safeReviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-700 mb-4">You haven't written any reviews yet.</p>
        <Link
          to="/profile?tab=purchases"
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          View purchases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeReviews.map((r) => (
        <div
          key={
            r._id ||
            r.id ||
            `${r.product?._id || r.product?.id}-${r.createdAt}`
          }
          className="bg-white border border-gray-100 rounded-lg p-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 shrink-0">
              <Link to={r.product?._id ? `/products/${r.product?._id}` : "#"}>
                <img
                  src={
                    r.product?.image ||
                    r.product?.images?.[0] ||
                    "/api/placeholder/160/160"
                  }
                  alt={r.product?.name || "Product"}
                  className="w-full h-16 object-cover rounded"
                />
              </Link>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">
                  {r.product?.name || r.title || "Product"}
                </h3>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < (r.rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {r.reviewText || r.body || r.comment || r.text}
              </p>

              {Array.isArray(r.images) && r.images.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {r.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Review ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {r.createdAt &&
                    `Reviewed on ${new Date(r.createdAt).toLocaleDateString()}`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditReview?.(r)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors hover:cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteReview?.(r._id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors hover:cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Export wrapped in ErrorBoundary
export default function ReviewsTabWithBoundary(props) {
  return (
    <ErrorBoundary>
      <ReviewsTab {...props} />
    </ErrorBoundary>
  );
}
