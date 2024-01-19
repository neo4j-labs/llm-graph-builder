import { createContext, useState, useContext } from 'react';

export const BrowseCardVisibility = createContext({
    toggleBrowseCardVisibility: () => { },
    showBrowseCard: false as boolean,
});
export const useBrowseCardVisibility = () => {
    const browseVisibility = useContext(BrowseCardVisibility)
    return browseVisibility
}
export default function BrowseCardWrapper({children}) {
    const [showBrowseCard, setBrowseCard] = useState<boolean>(false);
    const toggleBrowseCardVisibility = () => {
        setBrowseCard((prev) => !prev)
    }
    return <BrowseCardVisibility.Provider value={{
        showBrowseCard,
        toggleBrowseCardVisibility
    }}>{children}</BrowseCardVisibility.Provider>
}