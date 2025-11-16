import api from './axios';

// upload single image
export const uploadSingleImage = async (file, type = 'product') => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);

  const response = await api.post('/upload/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// upload multiple images
export const uploadMultipleImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await api.post('/upload/multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// upload profile picture
export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', 'profile');

  const response = await api.post('/upload/profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// delete image
export const deleteImage = async (imageUrl) => {
  const response = await api.delete('/upload', {
    data: { imageUrl } // ✅ FIX: DELETE requests need data in body
  });
  return response.data;
};

// legacy aliases
export const uploadImage = uploadSingleImage;
export const uploadImages = uploadMultipleImages;
