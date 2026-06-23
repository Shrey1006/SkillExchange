import dsaThumb from "../assets/thumb-dsa.svg";
import webThumb from "../assets/thumb-web.svg";
import mlThumb from "../assets/thumb-ml.svg";
import defaultThumb from "../assets/thumb-default.svg";
import notesThumb from "../assets/thumb-notes.svg";

const videoThumbs = [
  {
    keywords: ["dsa", "algorithm", "data structure", "striver"],
    src: dsaThumb,
  },
  {
    keywords: ["web", "javascript", "react", "node", "express", "mongodb", "full stack"],
    src: webThumb,
  },
  {
    keywords: ["machine", "learning", "ai", "artificial", "data science"],
    src: mlThumb,
  },
];

function getVideoThumb(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return videoThumbs.find((thumb) => thumb.keywords.some((keyword) => text.includes(keyword)))?.src || defaultThumb;
}

export default function ResourceThumb({ item = {}, type = "video", label }) {
  const src = type === "notes" ? notesThumb : getVideoThumb(item.title, item.description);
  const alt = label || item.title || (type === "notes" ? "Notes thumbnail" : "Course thumbnail");

  return (
    <div className="resource-thumb">
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}
