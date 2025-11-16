import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatCurrency';
import { logger } from '../../utils/logger';

const ProductCard = ({ product, onGreenBg = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { error: showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (!product || !product._id || !product.name || product.price === undefined) {
    return null;
  }

  const isOwn = Boolean(product.seller && user?._id &&
    (user._id === product.seller._id || user._id === product.seller));

  const inWishlist = Boolean(wishlist?.some(item => {
    const itemProductId = item._id || item.product?._id || item.product;
    return itemProductId === product._id;
  }));

  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      if (inWishlist) {
        await removeFromWishlist(product._id);
      } else {
        // provide product object for optimistic update
        await addToWishlist(product._id, product);

        // show "Added!" feedback
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'failed to update wishlist';
      showError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/products/${product._id}`);
  };

  

  return (
    <div
      onClick={handleCardClick}
      className="group cursor-pointer transform transition-transform duration-300 hover:scale-102"
    >
      {/* product image*/}
      <div
        className="relative bg-white rounded-2xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-shadow duration-300 ease-in-out"
        style={{ aspectRatio: '4/5' }}
      >
        {/* image with hover zoom */}
        <div className="relative w-full h-full overflow-hidden bg-gray-100">
          {/* placeholder skeleton until image loads to prevent layout shift */}
          {(!product.images?.[0]) ? (
            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
          ) : null}
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/400x500'}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              // remove placeholder by setting opacity via class
              e.currentTarget.classList.remove('opacity-0');
              e.currentTarget.classList.add('opacity-100');
            }}
            className="w-full h-full object-cover transition-opacity duration-300 opacity-0"
          />

          {/* dark overlay with view product on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 ease-in-out flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-white text-sm font-medium tracking-wide px-6 py-2 border border-white/80 rounded-full backdrop-blur-sm">
              View Product
            </span>
          </div>
        </div>

        {/* top-left badge pill*/}
        {isOwn && (
          <div className="absolute top-3 left-3 px-4 py-1.5 bg-primary rounded-full text-xs font-medium text-white tracking-wide z-20">
            Your Listing
          </div>
        )}

        {product.stock === 0 && (
          <div className="absolute top-3 left-3 px-4 py-1.5 bg-black/90 backdrop-blur-sm rounded-full text-xs font-medium text-white tracking-wide z-20">
            Sold Out
          </div>
        )}

        {/* top right favorite button */}
        {/* favorite button  */}
        {!isOwn && (
          <button
            onClick={handleFavorite}
            disabled={isProcessing}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 z-20 hover:cursor-pointer ${
              inWishlist
                ? 'bg-white/95 text-red-500'
                : 'bg-white/80 text-gray-600 hover:bg-white/95 hover:text-red-500'
            } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Heart className={`w-4 h-4 transition-transform ${inWishlist ? 'fill-current scale-110' : ''} ${justAdded ? 'animate-bounce' : ''}`} />
            )}
          </button>
        )}
      </div>

      {/* product info*/}
      <div className="space-y-2">
        {/* product name*/}
        <h3 className={`font-extrabold ${onGreenBg ? 'text-white group-hover:text-white/80' : 'text-main group-hover:text-primary'} text-base leading-tight transition-colors duration-300 line-clamp-2`}>
          {product.name}
        </h3>


        {/* star rating + review count */}
        {/* uncomment nalang when reviews are already implemented....
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
            ))}
          </div>
          <span className="text-xs text-gray">(24)</span>
        </div>
        */}

        {/* price */}
        <p className={`text-lg font-semibold ${onGreenBg ? 'text-white' : 'text-main'} pt-1`}>
          {formatCurrency(product.price)}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;