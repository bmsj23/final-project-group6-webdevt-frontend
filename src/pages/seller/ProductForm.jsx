import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProduct, updateProduct, getProduct } from '../../api/products';
import { uploadImage } from '../../api/upload';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductFormHeader from '../../components/seller/product-form/ProductFormHeader';
import BasicInfoSection from '../../components/seller/product-form/BasicInfoSection';
import PricingSection from '../../components/seller/product-form/PricingSection';
import ImagesSection from '../../components/seller/product-form/ImagesSection';
import ShippingSection from '../../components/seller/product-form/ShippingSection';
import { CATEGORY_DATA } from '../../constants/categories';
import { logger } from '../../utils/logger';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    mainCategory: '',
    category: '',
    condition: 'New',
    images: [],
    shippingAvailable: false,
    shippingFee: ''
  });

  const [errors, setErrors] = useState({});
  const [charCounts, setCharCounts] = useState({ name: 0, description: 0 });

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      const product = response.data?.product || response.product || response.data || response;

      // find main category from subcategory
      const mainCat = CATEGORY_DATA.find(cat => cat.subcategories.includes(product.category));

      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        mainCategory: mainCat?.name || '',
        category: product.category,
        condition: product.condition,
        images: product.images || [],
        shippingAvailable: product.shippingAvailable || false,
        shippingFee: product.shippingFee?.toString() || ''
      });

      setCharCounts({
        name: product.name.length,
        description: product.description.length
      });
    } catch (err) {
      logger.error('failed to fetch product:', err);
      error('Failed To Load Product');
      navigate('/seller/products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (name === 'name' || name === 'description') {
      setCharCounts(prev => ({ ...prev, [name]: value.length }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'mainCategory') {
      setFormData(prev => ({ ...prev, category: '' }));
    }
  };

  const handleConditionChange = (condition) => {
    setFormData(prev => ({ ...prev, condition }));
  };

  const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files);

  if (formData.images.length + files.length > 5) {
    error('Maximum 5 Images Allowed');
    return;
  }

  setUploadingImages(true);

  try {
    const uploadPromises = files.map(file => 
      uploadImage(file, 'product') // Pass file and type
    );

    const results = await Promise.all(uploadPromises);
    
    const imageUrls = results.map(res => 
      res.data?.url || 
      res.data?.secure_url || 
      res.url || 
      res.secure_url ||
      res
    );

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));

    success(`${files.length} Image(s) Uploaded`);
  } catch (err) {
    logger.error('failed to upload images:', err);
    error(err?.response?.data?.message || 'Failed To Upload Images');
  } finally {
    setUploadingImages(false);
    e.target.value = '';
  }
};

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'product name is required';
    } else if (formData.name.length < 3 || formData.name.length > 200) {
      newErrors.name = 'name must be 3-200 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'description is required';
    } else if (formData.description.length < 10 || formData.description.length > 2000) {
      newErrors.description = 'description must be 10-2000 characters';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = 'valid price is required';
    }

    const stock = parseInt(formData.stock);
    if (formData.stock === '' || isNaN(stock) || stock < 0) {
      newErrors.stock = 'valid stock quantity is required';
    }

    if (!formData.category) {
      newErrors.category = 'category is required';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'at least 1 image is required';
    }

    if (formData.shippingAvailable) {
      const shippingFee = parseFloat(formData.shippingFee);
      if (!formData.shippingFee || isNaN(shippingFee) || shippingFee < 0) {
        newErrors.shippingFee = 'valid shipping fee is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Please fix the errors', error);
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        shippingAvailable: formData.shippingAvailable
      };

      if (formData.shippingAvailable) {
        productData.shippingFee = parseFloat(formData.shippingFee);
      }

      if (isEditMode) {
        await updateProduct(id, productData);
        success('Product Updated Successfully');
      } else {
        await createProduct(productData);
        success('Product Created Successfully');
      }

      navigate('/seller/products');
    } catch (err) {
      logger.error('failed to save product:', err);
      error(err.response?.data?.message || 'Failed to Save Product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductFormHeader isEditMode={isEditMode} />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <BasicInfoSection
          formData={formData}
          errors={errors}
          charCounts={charCounts}
          onChange={handleChange}
        />

        <PricingSection
          formData={formData}
          errors={errors}
          onChange={handleChange}
          onConditionChange={handleConditionChange}
        />

        <ImagesSection
          images={formData.images}
          errors={errors}
          uploadingImages={uploadingImages}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
        />

        <ShippingSection
          formData={formData}
          errors={errors}
          onChange={handleChange}
        />

        <div className="flex gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/seller/products')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 hover:cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploadingImages}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;