import React, { createContext, useState, useContext } from "react";

const UpdateContext = createContext();

export function UpdateProvider({ children }) {
    const [isPaused, setIsPaused] = useState(false);

    return (
        <UpdateContext.Provider value={{ isPaused, setIsPaused }}>
            {children}
        </UpdateContext.Provider>
    );
}

export function useUpdate() {
    return useContext(UpdateContext);
}

