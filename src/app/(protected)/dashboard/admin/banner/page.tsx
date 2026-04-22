// "use client";

// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Image from "next/image";
// import Swal from "sweetalert2";
// import MainDatatable from "@/components/common/MainDatatable";
// import { EditSvg, SwitchOffSvg, SwitchOnSvg } from "@/components/svgs/page";

// const IMG_URL = process.env.NEXT_PUBLIC_IMG_URL || "";

// interface Banner {
//   _id: string;
//   title: string;
//   redirectTo: string;
//   redirectionUrl: string;
//   bannerImage: string;
//   status: "active" | "inactive";
// }

// const Banner = () => {
//   const router = useRouter();
//   const [appBannerData, setAppBannerData] = useState<Banner[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Fetch banners
//   const fetchBanners = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `${process.env.NEXT_PUBLIC_API_URL}/api/admin/get-app-banners`,
//         {
//           cache: "no-store",
//           headers: {
//             "Cache-Control": "no-cache",
//           },
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("API Response:", data); // Debug log

//       // Extract banners array from response
//       if (data.success && Array.isArray(data.banners)) {
//         setAppBannerData(data.banners);
//         console.log("Banners set:", data.banners); // Debug log
//       } else {
//         console.error("Invalid data format:", data);
//         setAppBannerData([]);
//       }
//     } catch (error) {
//       console.error("Error fetching banners:", error);
//       setAppBannerData([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Change banner status with SweetAlert
//   const changeBannerStatus = async (banner: Banner) => {
//     const newStatus = banner.status === "active" ? "inactive" : "active";
    
//     const result = await Swal.fire({
//       title: 'Change Banner Status?',
//       text: `Are you sure you want to ${newStatus === "active" ? "activate" : "deactivate"} the banner "${banner.title}"?`,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonColor: '#3085d6',
//       cancelButtonColor: '#d33',
//       confirmButtonText: `Yes, set to ${newStatus}`,
//       cancelButtonText: 'Cancel'
//     });

//     if (!result.isConfirmed) return;

//     try {
//       // Show loading
//       Swal.fire({
//         title: 'Updating...',
//         text: 'Please wait',
//         allowOutsideClick: false,
//         didOpen: () => {
//           Swal.showLoading();
//         }
//       });

//       const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/update_banner_status`;
//       console.log("Calling API:", apiUrl);
//       console.log("Banner ID:", banner._id);

//       const response = await fetch(apiUrl, {
//         method: "POST",
//         headers: { 
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ bannerId: banner._id }),
//       });

//       console.log("Response status:", response.status);

//       // Check if response is JSON
//       const contentType = response.headers.get("content-type");
//       if (!contentType || !contentType.includes("application/json")) {
//         const text = await response.text();
//         console.error("Non-JSON response:", text.substring(0, 200));
//         throw new Error(`Server error: Expected JSON but got ${contentType}. Status: ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("Status update response:", data);

//       if (response.ok && data.success) {
//         await fetchBanners();
        
//         Swal.fire({
//           icon: 'success',
//           title: 'Status Updated!',
//           text: `Banner has been ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
//           timer: 2000,
//           showConfirmButton: false
//         });
//       } else {
//         throw new Error(data.message || 'Failed to update status');
//       }
//     } catch (error) {
//       console.error("Error changing banner status:", error);
//       Swal.fire({
//         icon: 'error',
//         title: 'Error',
//         text: error instanceof Error ? error.message : 'Error updating banner status'
//       });
//     }
//   };

//   // Navigate to edit page
//   const handleEdit = (banner: Banner) => {
//     router.push(
//       `/banner/add-banner?data=${encodeURIComponent(JSON.stringify(banner))}`
//     );
//   };

//   // Datatable Columns
//   const columns = [
//     {
//       name: "S.No.",
//       selector: (row: Banner, index?: number) => (index ?? 0) + 1,
      
//     },
//     {
//       name: "Title",
//       selector: (row: Banner) => row?.title || "N/A",
      
//     },
//     {
//       name: "Redirect Page",
//       selector: (row: Banner) => row?.redirectTo || "N/A",
      
//     },
//     {
//       name: "Redirect Url",
//       selector: (row: Banner) => {
//         if (!row?.redirectionUrl) return "N/A";
//         const url = row.redirectionUrl;
//         return url.length > 50 ? `${url.slice(0, 50)}...` : url;
//       },
      
//     },
//     {
//       name: "Banner",
//       cell: (row: Banner) => (
//         <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100">
//           {row.bannerImage ? (
//             <Image
//               src={`${IMG_URL}${row.bannerImage}`}
//               alt={row.title || "Banner"}
//               fill
//               className="object-cover"
//               sizes="48px"
//               unoptimized
//             />
//           ) : (
//             <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
//               No Image
//             </div>
//           )}
//         </div>
//       ),
//       width: "120px",
//     },
//     {
//       name: "Status",
//       cell: (row: Banner) => (
//         <div
//           onClick={() => changeBannerStatus(row)}
//           className="cursor-pointer"
//         >
//           {row?.status === "active" ? <SwitchOnSvg /> : <SwitchOffSvg />}
//         </div>
//       ),
//       width: "100px",
//     },
//     {
//       name: "Action",
//       cell: (row: Banner) => (
//         <div className="flex gap-5 items-center">
//           <div onClick={() => handleEdit(row)} className="cursor-pointer">
//             <EditSvg />
//           </div>
//         </div>
//       ),
//       width: "100px",
//     },
//   ];

//   useEffect(() => {
//     fetchBanners();
//   }, []);

//   return (
//     <div className="p-6">
//       <MainDatatable
//         data={appBannerData}
//         columns={columns}
//         title="Banner"
//         url="/banner/add-banner"
//         addButtonActive={appBannerData.length < 10}
//         buttonMessage="Maximum 10 banners are allowed."
//         isLoading={loading}
//       />
//     </div>
//   );
// };

// export default Banner;


import BannerManagement from '@/components/bannerNew/BannerManagement'
import React from 'react'

const page = () => {
  return (
    <div className=''>
    <BannerManagement/>
    </div>
  )
}

export default page
