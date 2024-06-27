import React, { useState, useEffect, useRef } from 'react';
import { HoverableLinkProps } from '../../types';
const HoverableLink: React.FC<HoverableLinkProps> = ({ url, children }) => {
  const [hovering, setHovering] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hovering) {
      setIframeSrc('');
      timer = setTimeout(() => {
        setIframeSrc(url);
      }, 100);
    }
    return () => clearTimeout(timer);
  }, [hovering, url]);
  const handleMouseEnter = (event: React.MouseEvent) => {
    setHovering(true);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };
  const handleMouseMove = (event: React.MouseEvent) => {
    if (hovering) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };
  const handleMouseLeave = () => {
    setHovering(false);
  };
  const isYouTubeURL = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  const extractYouTubeVideoId = (url: string): string => {
    const videoIdRegex = /(?:\/embed\/|\/watch\?v=|\/(?:embed\/|v\/|watch\?.*v=|youtu\.be\/|embed\/|v=))([^&?#]+)/;
    const match = url.match(videoIdRegex);
    return match ? match[1] : '';
  };
  return (
    <div
      className='hoverable-link-container'
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {hovering && (
        <div
          className='popup'
          ref={popupRef}
          style={{ left: `${mousePosition.x}px`, top: `${mousePosition.y - (popupRef.current?.offsetHeight || 0)}px` }}
        >
          {isYouTubeURL(url) ? (
            <iframe
              width='360'
              height='215'
              src={`https://www.youtube.com/embed/${extractYouTubeVideoId(url)}?controls=0`}
              title='YouTube video player'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              referrerPolicy='strict-origin-when-cross-origin'
              allowFullScreen
            />
          ) : (
            iframeSrc && <iframe src={iframeSrc} title='Link Preview' className='iframe-preview' />
          )}
        </div>
      )}
      <a href={url} target='_blank' rel='noopener noreferrer' />
    </div>
  );
};
export default HoverableLink;
