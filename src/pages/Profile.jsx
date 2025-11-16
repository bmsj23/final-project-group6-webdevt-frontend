import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { updateMyProfile } from "../api/users";
import { uploadProfilePicture } from "../api/upload";
import { getMyListings } from "../api/products";
import { getMyPurchases, getMySales } from "../api/orders";
import {
  getMyReviews,
  getUserReviews,  createReview,
  updateReview,
  deleteReview,
} from "../api/reviews";
import Modal from "../components/common/Modal";
import ReviewForm from "../components/common/ReviewForm";
import { logger } from "../utils/logger";
import {
  ProfileHeader,
  ProfileDisplay,
} from "../components/profile/ProfileHeader";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import ProfileTabs from "../components/profile/ProfileTabs";
import ListingsTab from "../components/profile/ListingsTab";
import PurchasesTab from "../components/profile/PurchasesTab";
import SalesTab from "../components/profile/SalesTab";
import ReviewsTab from "../components/profile/ReviewsTab";

const Profile = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (
      tabFromUrl &&
      ["profile", "listings", "purchases", "sales", "reviews"].includes(
        tabFromUrl
      )
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const tabs = [
    { id: "profile", label: "My Profile" },
    { id: "listings", label: "My Listings" },
    { id: "purchases", label: "My Purchases" },
    { id: "sales", label: "My Sales" },
    { id: "reviews", label: "Reviews" },
  ];

  const { user, updateUser } = useAuth();
  const { error: showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);

  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState(null);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState(null);

  const [authoredReviews, setAuthoredReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  const [reviewModal, setReviewModal] = useState({
    show: false,
    order: null,
    product: null,
    existingReview: null,
  });
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [form, setForm] = useState({
    username: user?.username || "",
    phone: user?.phone || "",
    profilePicture: user?.profilePicture || user?.picture || "",
  });

  // Keep form state in sync with user from auth context
  useEffect(() => {
    setForm({
      username: user?.username || "",
      phone: user?.phone || "",
      profilePicture: user?.profilePicture || user?.picture || "",
    });
  }, [user]);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // show preview
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    // set form preview immediately so user sees change
    setForm((s) => ({ ...s, profilePicture: url }));
  };

  const handleSave = async (e) => {
  if (e && e.preventDefault) e.preventDefault();
  setIsSaving(true);
  try {
    let profilePicUrl = form.profilePicture;

    if (selectedFile) {
      const uploaded = await uploadProfilePicture(selectedFile);
      profilePicUrl =
        uploaded?.url ||
        uploaded?.secure_url ||
        uploaded?.path ||
        uploaded?.imageUrl ||
        uploaded?.data?.url ||
        uploaded?.src ||
        uploaded?.image ||
        profilePicUrl;
    }

    // 🔧 FIX: Map frontend fields to backend field names
    const updatePayload = {
      profilePicture: profilePicUrl,
    };

    // Only include fields that backend accepts
    if (form.username) {
      updatePayload.name = form.username;  // Backend expects 'name'
    }
    if (form.phone) {
      updatePayload.contactNumber = form.phone;  // Backend expects 'contactNumber'
    }

    console.log('Sending update payload:', updatePayload); // Debug log

    const updated = await updateMyProfile(updatePayload);

    console.log('Update response:', updated); // Debug log

    if (updateUser) {
      const updatedData = updated.data?.user || updated.data || updated.user || updated || {};

      const mergedUser = {
        ...user,
        username: updatedData.name || updatedData.username || user.username,
        phone: updatedData.contactNumber || updatedData.phone || user.phone,
        profilePicture: updatedData.profilePicture || user.profilePicture || user.picture,
        picture: updatedData.profilePicture || user.profilePicture || user.picture,
      };
      
      console.log('Merged user data:', mergedUser); // Debug log
      updateUser(mergedUser);
    }

    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setIsEditing(false);
  } catch (err) {
    console.error('Profile update error:', err); // Debug log
    console.error('Error response:', err.response); // Debug log
    const msg =
      err?.response?.data?.message ||
      err.message ||
      "Failed to update profile";
    showError(msg);
  } finally {
    setIsSaving(false);
  }
};

  const confirmSave = async () => {
    // close modal then run save
    setShowConfirm(false);
    try {
      await handleSave();
    } catch {
      // handleSave already shows errors via toasts
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm({
      username: user?.username || "",
      phone: user?.phone || "",
      profilePicture: user?.profilePicture || user?.picture || "",
    });
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore revoke errors
      }
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  // Load user's listings when switching to Listings tab
  useEffect(() => {
    const loadListings = async () => {
      setListingsLoading(true);
      setListingsError(null);
      try {
        const data = await getMyListings();

        // backend returns { success: true, data: { products: [...], total, page, pages } }
        let products = [];
        if (data?.data?.products) {
          products = data.data.products;
        } else if (data?.products) {
          products = data.products;
        } else if (Array.isArray(data?.data)) {
          products = data.data;
        } else if (Array.isArray(data)) {
          products = data;
        }

        setMyListings(products);
      } catch (err) {
        setListingsError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load listings"
        );
      } finally {
        setListingsLoading(false);
      }
    };

    if (activeTab === "listings") {
      loadListings();
    }

    // load purchases when switching to purchases tab
    const loadPurchases = async () => {
      setPurchasesLoading(true);
      setPurchasesError(null);
      try {
        const data = await getMyPurchases();

        // backend returns { success: true, data: { orders: [...] } }
        let orders = [];
        if (data?.data?.orders) {
          orders = data.data.orders;
        } else if (data?.orders) {
          orders = data.orders;
        } else if (Array.isArray(data?.data)) {
          orders = data.data;
        } else if (Array.isArray(data)) {
          orders = data;
        }

        // store full orders for review functionality
        setPurchaseOrders(orders);
      } catch (err) {
        setPurchasesError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load purchases"
        );
      } finally {
        setPurchasesLoading(false);
      }
    };

    if (activeTab === "purchases") {
      loadPurchases();
    }

    // load sales when switching to sales tab
    const loadSales = async () => {
  setSalesLoading(true);
  setSalesError(null);
  try {
    const response = await getMySales();
    
    // Handle the nested structure: response.data.orders
    let orders = [];
    
    if (Array.isArray(response)) {
      orders = response;
    } else if (response?.data?.orders) {
      // This handles: { success: true, data: { orders: [...], pagination: {...} } }
      orders = response.data.orders;
    } else if (response?.orders) {
      // Fallback: { orders: [...] }
      orders = response.orders;
    } else if (response?.data && Array.isArray(response.data)) {
      // Fallback: { data: [...] }
      orders = response.data;
    }
    
    // flatten order items into sale entries with buyer + order metadata
    const saleEntries = [];
    
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        const orderItems =
          order.items || order.products || order.orderItems || [];
        if (Array.isArray(orderItems) && orderItems.length) {
          orderItems.forEach((it) => {
            const product =
              it.product || it.productId || it.productInfo || it;
            const quantity = it.quantity || it.qty || it.count || 1;
            const price =
              it.price || it.amount || product?.price || order.total || 0;
            saleEntries.push({
              orderId: order._id || order.id,
              product,
              buyer:
                order.buyer ||
                order.customer ||
                order.user ||
                order.buyerInfo,
              quantity,
              price,
              status: order.status || order.orderStatus,
              createdAt: order.createdAt || order.date || order.purchasedAt,
            });
          });
        }
      });
    } else {
      logger.error(
        "loadSales: expected orders array but got:",
        orders,
        "raw response:",
        response
      );
    }
    
    setSales(saleEntries);
  } catch (err) {
    setSalesError(
      err?.response?.data?.message || err.message || "Failed to load sales"
    );
  } finally {
    setSalesLoading(false);
  }
};

    if (activeTab === "sales") {
      loadSales();
    }

    // load authored reviews when Reviews tab is active
    const loadAuthoredReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        // The route /api/reviews/my does not exist.
        // Use getUserReviews with the logged-in user's ID instead.
        if (!user?._id) throw new Error("User not found");
        const data = await getUserReviews(user._id);
        // expected shapes: array OR { reviews: [...] } OR { data: [...] }
        const reviews = Array.isArray(data)
          ? data
          : data?.reviews || data?.data || [];
        setAuthoredReviews(reviews);
      } catch (err) {
        setReviewsError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load reviews"
        );
      } finally {
        setReviewsLoading(false);
      }
    };

    if (activeTab === "reviews") {
      loadAuthoredReviews();
    }
  }, [activeTab, user?._id]);

  // review handlers
  const handleWriteReview = (order, product) => {
    setReviewModal({ show: true, order, product, existingReview: null });
  };

  const handleEditReview = (review) => {
    setReviewModal({
      show: true,
      order: { _id: review.order },
      product: review.product,
      existingReview: review,
    });
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("are you sure you want to delete this review?")) return;

    try {
      await deleteReview(reviewId);
      // refresh reviews list
      // Use getUserReviews with the logged-in user's ID to refresh
      const data = await getMyReviews();
      const reviews = Array.isArray(data) ? data : data?.reviews || data?.data || [];
      setAuthoredReviews(reviews);
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete review");
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    if (reviewModal.existingReview) {
      await updateReview(reviewModal.existingReview._id, reviewData);
    } else {
      await createReview({
        ...reviewData,
        productId: reviewModal.product._id,
        orderId: reviewModal.order._id,
      });
    }

    // refresh reviews list
    // Use getUserReviews with the logged-in user's ID to refresh
    const data = await getMyReviews();
    const reviews = Array.isArray(data) ? data : data?.reviews || data?.data || [];
    setAuthoredReviews(reviews);

    setReviewModal({
      show: false,
      order: null,
      product: null,
      existingReview: null,
    });
  };

  // check if product in order can be reviewed
  const canReview = (order, productId) => {
    if (order.status !== "completed") return false;
    // check if review already exists for this product in this order
    const hasReview = authoredReviews.some(
      (r) => r.product?._id === productId && r.order === order._id
    );
    return !hasReview;
  };

  //Keyboard navigation for Profile Menu
  const handleKeyDown = (e, index) => {
    const key = e.key;
    let newIndex = index;

    if (key === "ArrowRight" || key === "ArrowDown") {
      newIndex = (index + 1) % tabs.length;
      setActiveTab(tabs[newIndex].id);
      document.getElementById(`tab-${tabs[newIndex].id}`)?.focus();
      e.preventDefault();
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      newIndex = (index - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[newIndex].id);
      document.getElementById(`tab-${tabs[newIndex].id}`)?.focus();
      e.preventDefault();
    } else if (key === "Home") {
      setActiveTab(tabs[0].id);
      document.getElementById(`tab-${tabs[0].id}`)?.focus();
      e.preventDefault();
    } else if (key === "End") {
      setActiveTab(tabs[tabs.length - 1].id);
      document.getElementById(`tab-${tabs[tabs.length - 1].id}`)?.focus();
      e.preventDefault();
    }
  };

  // if URL contains ?tab=... set the active tab on mount/navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6">
          <div className="md:flex md:space-x-6">
            {/* Profile Menu List */}
            <div className="md:w-64 mb-4 md:mb-0">
              <ProfileTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Display Panel */}
            <div className="flex-1">
              {/* Profile Tab */}
              <div
                id="panel-profile"
                role="tabpanel"
                aria-labelledby="tab-profile"
                hidden={activeTab !== "profile"}
                tabIndex={0}
              >
                {!isEditing ? (
                  <>
                    <ProfileHeader
                      isEditing={isEditing}
                      onEditClick={() => setIsEditing(true)}
                    />
                    <ProfileDisplay user={user} />
                  </>
                ) : (
                  <ProfileEditForm
                    user={user}
                    form={form}
                    previewUrl={previewUrl}
                    isSaving={isSaving}
                    showConfirm={showConfirm}
                    onChange={onChange}
                    onFileChange={onFileChange}
                    onSaveClick={() => setShowConfirm(true)}
                    onCancel={handleCancel}
                    onConfirmSave={confirmSave}
                    onCloseConfirm={() => setShowConfirm(false)}
                  />
                )}
              </div>

              {/* My Listings Tab */}
              <div
                id="panel-listings"
                role="tabpanel"
                aria-labelledby="tab-listings"
                hidden={activeTab !== "listings"}
                tabIndex={0}
              >
                <h2 className="text-xl font-semibold mb-4">My Listings</h2>
                <ListingsTab
                  myListings={myListings}
                  loading={listingsLoading}
                  error={listingsError}
                />
              </div>

              {/* Purchases Tab */}
              <div
                id="panel-purchases"
                role="tabpanel"
                aria-labelledby="tab-purchases"
                hidden={activeTab !== "purchases"}
                tabIndex={0}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold mb-4">My Purchases</h2>
                </div>
                <PurchasesTab
                  purchaseOrders={purchaseOrders}
                  loading={purchasesLoading}
                  error={purchasesError}
                  canReview={canReview}
                  onWriteReview={handleWriteReview}
                />
              </div>

              {/* Sales Tab */}
              <div
                id="panel-sales"
                role="tabpanel"
                aria-labelledby="tab-sales"
                hidden={activeTab !== "sales"}
                tabIndex={0}
              >
                <h2 className="text-xl font-semibold mb-4">My Sales</h2>
                <SalesTab
                  sales={sales}
                  loading={salesLoading}
                  error={salesError}
                />
              </div>

              {/* Reviews Tab */}
              <div
                id="panel-reviews"
                role="tabpanel"
                aria-labelledby="tab-reviews"
                hidden={activeTab !== "reviews"}
                tabIndex={0}
              >
                <h2 className="text-xl font-semibold mb-4">My Reviews</h2>
                <ReviewsTab
                  authoredReviews={authoredReviews}
                  loading={reviewsLoading}
                  error={reviewsError}
                  onEditReview={handleEditReview}
                  onDeleteReview={handleDeleteReview}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal.show}
        onClose={() =>
          setReviewModal({
            show: false,
            order: null,
            product: null,
            existingReview: null,
          })
        }
        title={reviewModal.existingReview ? "edit review" : "write a review"}
      >
        <div className="mb-4">
          <h3 className="font-semibold">{reviewModal.product?.name}</h3>
          {reviewModal.product?.images?.[0] && (
            <img
              src={reviewModal.product.images[0]}
              alt={reviewModal.product.name}
              className="w-24 h-24 object-cover rounded mt-2"
            />
          )}
        </div>
        <ReviewForm
          existingReview={reviewModal.existingReview}
          onSubmit={handleReviewSubmit}
          onCancel={() =>
            setReviewModal({
              show: false,
              order: null,
              product: null,
              existingReview: null,
            })
          }
        />
      </Modal>
    </div>
  );
};

export default Profile;
