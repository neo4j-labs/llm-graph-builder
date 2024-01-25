export const url = ()=>{
    if (process.env.BACKEND_API_URL !== undefined) {
        return process.env.BACKEND_API_URL;
    }

    const origin = window.location.origin.split("-");
    origin[origin.length - 1] = "8000";
    const finalURL= `${origin.join("-")}.app.github.dev`;
    return finalURL;
}

export const formatFileSize = (bytes: any) => {
    return (bytes / (1024 * 1024)).toFixed(2) + 'mb'
}
