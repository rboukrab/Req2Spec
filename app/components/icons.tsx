"use client";

import React from "react";

export interface IconProps {
  d: React.ReactNode;
  size?: number;
  fill?: string;
  sw?: number;
  style?: React.CSSProperties;
}

export function Icon({ d, size = 16, fill = "none", sw = 1.9, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
         strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d}
    </svg>
  );
}

export const I = {
  send:  <Icon d={<><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></>} />,
  check: <Icon d={<path d="m4 12 5 5L20 6"/>} size={13} sw={2.4} />,
  flag:  <Icon d={<><path d="M5 21V4"/><path d="M5 4h11l-2 3 2 3H5"/></>} size={14} />,
  edit:  <Icon d={<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>} size={14} />,
  q:     <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.3-1.4 1-1.4 1.9v.3"/><path d="M12 17h.01"/></>} size={15} />,
  doc:   <Icon d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>} size={20} />,
  list:  <Icon d={<><path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></>} size={16} />,
  x:     <Icon d={<path d="M6 6l12 12M18 6 6 18"/>} size={16} />,
  arrow: <Icon d={<path d="m9 6 6 6-6 6"/>} size={13} sw={2.2} />,
  spark: <Icon d={<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>} size={14} />,
  panel: <Icon d={<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/></>} size={15} />,
  paperclip: <Icon d={<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>} size={16} />,
  download: <Icon d={<><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>} size={18} />,
};
