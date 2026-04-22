"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { UploadImageSvg } from "@/components/svgs/page";
import Swal from "sweetalert2";

const IMG_URL = process.env.NEXT_PUBLIC_IMG_URL || "";

interface BannerDetail {
  redirectPage: string;
  bannerTitle: string;
  redirectUrl: string;
  priorityPage: string;
}

interface InputFieldError {
  redirectPage: string;
  bannerTitle: string;
  redirectUrl: string;
  priorityPage: string;
  image: string;
}

interface ImageState {
  file: string;
  bytes: File | null;
}

const AddBanner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Add mounted state to ensure client-side rendering
  const [isMounted, setIsMounted] = useState(false);
  
  // Get banner data from URL params if editing
  const [stateData, setStateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [bannerDetail, setBannerDetail] = useState<BannerDetail>({
    redirectPage: "",
    bannerTitle: "",
    redirectUrl: "",
    priorityPage: "",
  });

  const [inputFieldError, setInputFieldError] = useState<InputFieldError>({
    redirectPage: "",
    bannerTitle: "",
    redirectUrl: "",
    priorityPage: "",
    image: "",
  });

  const [image, setImage] = useState<ImageState>({
    file: "",
    bytes: null,
  });

  // Set mounted state on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load banner data if editing
  useEffect(() => {
    if (!isMounted) return;

    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        setStateData(parsedData);
        setBannerDetail({
          redirectPage: parsedData?.redirectTo || "",
          bannerTitle: parsedData?.title || "",
          redirectUrl: parsedData?.redirectionUrl || "",
          priorityPage: parsedData?.priorityPage || "",
        });
        setImage({
          file: parsedData?.bannerImage ? `${IMG_URL}${parsedData.bannerImage}` : "",
          bytes: null,
        });
      } catch (error) {
        console.error("Error parsing banner data:", error);
      }
    }
  }, [searchParams, isMounted]);

  // Handle Input Field Error
  const handleInputFieldError = (input: keyof InputFieldError, value: string) => {
    setInputFieldError((prev) => ({ ...prev, [input]: value }));
  };

  // Handle Input Field Data
  const handleInputField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBannerDetail({ ...bannerDetail, [name]: value });
  };

  // Handle Image Upload
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage({
        file: URL.createObjectURL(e.target.files[0]),
        bytes: e.target.files[0],
      });
      handleInputFieldError("image", "");
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setImage({
        file: URL.createObjectURL(e.dataTransfer.files[0]),
        bytes: e.dataTransfer.files[0],
      });
      handleInputFieldError("image", "");
    }
  };

  // Handle Validation
  const handleValidation = (): boolean => {
    let isValid = true;
    const { bannerTitle, redirectPage, redirectUrl } = bannerDetail;
    const { file } = image;

    if (!bannerTitle) {
      handleInputFieldError("bannerTitle", "Please Enter Banner Name");
      isValid = false;
    }
    if (!redirectPage) {
      handleInputFieldError("redirectPage", "Please Select Redirect Page");
      isValid = false;
    }
    if (!redirectUrl) {
      handleInputFieldError("redirectUrl", "Please Enter Redirect URL");
      isValid = false;
    }
    if (!file) {
      handleInputFieldError("image", "Please Select Image");
      isValid = false;
    }
    return isValid;
  };

  // Handle Submit

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!handleValidation()) {
    return;
  }

  setIsLoading(true);

  try {
    const { redirectPage, bannerTitle, redirectUrl, priorityPage } = bannerDetail;
    const formData = new FormData();

    if (stateData) {
      formData.append("bannersId", stateData._id);
    }

    formData.append("redirectTo", redirectPage);
    formData.append("title", bannerTitle);
    formData.append("bannerFor", "app");
    formData.append("redirectionUrl", redirectUrl);
    formData.append("priorityPage", priorityPage);
    
    if (image.bytes) {
      formData.append("bannerImage", image.bytes);
    }

    const endpoint = stateData 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/update-banners`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/add-banners`;

    // Show loading alert
    Swal.fire({
      title: `${stateData ? 'Updating' : 'Creating'} Banner...`,
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: stateData ? 'Banner updated successfully!' : 'Banner created successfully!',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
      
      router.push("/banner");
    } else {
      throw new Error(data.message || 'Failed to save banner');
    }
  } catch (error) {
    console.error("Error submitting banner:", error);
    await Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: error instanceof Error ? error.message : 'Error saving banner. Please try again.',
      confirmButtonColor: '#d33',
      confirmButtonText: 'Try Again'
    });
  } finally {
    setIsLoading(false);
  }
};

  // Show loading until component is mounted on client
  if (!isMounted) {
    return (
      <div className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg mb-5">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white shadow-sm border border-gray-200 rounded-lg mb-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-semibold text-gray-800">
          {stateData ? "Edit Banner" : "Add Banner"}
        </h1>
        <button
          onClick={() => router.push("/banner")}
          className="font-medium bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
        >
          Display
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Image Upload */}
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg">
              {image.file ? (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  htmlFor="upload-image"
                  className="flex flex-col items-center p-5 cursor-pointer"
                >
                  <div className="relative w-full h-[300px]">
                    <Image
                      src={image.file}
                      alt="Banner preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </label>
              ) : (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  htmlFor="upload-image"
                  className="flex flex-col items-center gap-5 py-24 cursor-pointer"
                >
                  <UploadImageSvg h="80" w="80" color="#C4C4C4" />
                  <div className="font-semibold text-lg text-gray-700">
                    Choose Your Image to Upload
                  </div>
                  <div className="font-medium text-base text-gray-500">
                    Or Drop Your Image Here
                  </div>
                </label>
              )}
              <input
                id="upload-image"
                onChange={handleImage}
                hidden
                accept="image/*"
                type="file"
              />
            </div>
            {inputFieldError.image && (
              <p className="text-red-600 text-sm mt-1 ml-3">
                {inputFieldError.image}
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banner Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bannerTitle"
                value={bannerDetail.bannerTitle}
                onChange={handleInputField}
                onFocus={() => handleInputFieldError("bannerTitle", "")}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  inputFieldError.bannerTitle ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {inputFieldError.bannerTitle && (
                <p className="text-red-600 text-sm mt-1">
                  {inputFieldError.bannerTitle}
                </p>
              )}
            </div>

            {/* Redirect Page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Redirect Page <span className="text-red-500">*</span>
              </label>
              <select
                name="redirectPage"
                value={bannerDetail.redirectPage}
                onChange={handleInputField}
                onFocus={() => handleInputFieldError("redirectPage", "")}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  inputFieldError.redirectPage ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              >
                <option value="" disabled>
                  ---Select Redirect Page---
                </option>
                <option value="customer_home">Customer Home</option>
              </select>
              {inputFieldError.redirectPage && (
                <p className="text-red-600 text-sm mt-1">
                  {inputFieldError.redirectPage}
                </p>
              )}
            </div>

            {/* Redirect URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="redirectUrl"
                value={bannerDetail.redirectUrl}
                onChange={handleInputField}
                onFocus={() => handleInputFieldError("redirectUrl", "")}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  inputFieldError.redirectUrl ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {inputFieldError.redirectUrl && (
                <p className="text-red-600 text-sm mt-1">
                  {inputFieldError.redirectUrl}
                </p>
              )}
            </div>

            {/* Priority Page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Page
              </label>
              <input
                type="text"
                name="priorityPage"
                value={bannerDetail.priorityPage}
                onChange={handleInputField}
                onFocus={() => handleInputFieldError("priorityPage", "")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isLoading}
              className={`font-medium px-6 py-3 rounded-lg text-white transition-colors duration-200 ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isLoading ? "Submitting..." : (stateData ? "Update Banner" : "Add Banner")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBanner;