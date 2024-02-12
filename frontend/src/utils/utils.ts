import { useCredentials } from "../context/UserCredentials";
import { uploadAPI } from "../services/Upload";



// const { files, filesData, setFiles, setFilesData } = useFileContext();

export const url = () => {
  if (process.env.BACKEND_API_URL !== undefined) {
    return process.env.BACKEND_API_URL;
  }
};

//Convert file object to Base64
export const fileToBase64 = (file: any) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Save file to local storage
export const saveFileToLocal = async (file: any) => {
  console.log(file.name);
  try {
    const base64String: any = await fileToBase64(file);
    localStorage.setItem(`${file.name}`, base64String);
    console.log('File saved to local storage');
  } catch (error) {
    console.error('Error saving file to local storage:', error);
  }
};

//convert from base64 back to file
export const base64ToFile = (base64String: any, fileName: any) => {
  const byteCharacters = atob(base64String.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const file = new File(byteArrays, fileName, { type: 'application/pdf' });
  return file;
};

// Retrieve file from local storage
export const getFileFromLocal = (filename: string) => {
  console.log(filename);
  const base64String = localStorage.getItem(filename);
  if (base64String) {
    const file = base64ToFile(base64String, filename);
    console.log('File fetched from local storage:', file);
    return file;
  } else {
    console.error('File not found in local storage');
    return null;
  }
};


//Common Function 

// const fileUpload = async (file: File, uid: number) => {
//   const { userCredentials } = useCredentials();
//   if (filesData[uid].status == 'None' && isClicked) {
//     const apirequests = [];
//     try {
//       setIsLoading(true);
//       setFilesData((prevfiles) =>
//         prevfiles.map((curfile, idx) => {
//           if (idx == uid) {
//             return {
//               ...curfile,
//               status: 'Uploading',
//             };
//           } else {
//             return curfile;
//           }
//         })
//       );
//       console.log('Before API CALL', file);
//       const apiResponse = await uploadAPI(file, userCredentials);
//       apirequests.push(apiResponse);
//       Promise.allSettled(apirequests)
//         .then((r) => {
//           r.forEach((apiRes) => {
//             if (apiRes.status === 'fulfilled' && apiRes.value) {
//               if (apiRes?.value?.data != 'Unexpected Error') {
//                 setFilesData((prevfiles) =>
//                   prevfiles.map((curfile, idx) => {
//                     if (idx == uid) {
//                       return {
//                         ...curfile,
//                         status: 'New',
//                       };
//                     } else {
//                       return curfile;
//                     }
//                   })
//                 );
//                 setIsLoading(false);
//               } else {
//                 throw new Error('API Failure');
//               }
//             }
//           });
//           setIsClicked(false);
//         })
//         .catch((err) => console.log(err));
//     } catch (err) {
//       console.log(err);
//       setIsLoading(false);
//       setIsClicked(false);
//       setFilesData((prevfiles) =>
//         prevfiles.map((curfile, idx) => {
//           if (idx == uid) {
//             return {
//               ...curfile,
//               status: 'Failed',
//               type: curfile.type?.split('/')[1]?.toUpperCase() ?? 'PDF',
//             };
//           } else {
//             return curfile;
//           }
//         })
//       );
//     }
//   }
// };