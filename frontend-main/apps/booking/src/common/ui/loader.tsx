import React from 'react';


import { ClipLoader } from "react-spinners";

export const Loader = ({ color, size }: { color: string; size: number }) => {
  return (
    <ClipLoader color={color ? color : "#3498db"} size={size ? size : 40} />
  );
};
