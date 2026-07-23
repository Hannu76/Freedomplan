import React, { useState, useEffect } from 'react';
import './LikeButton.css';

export default function LikeButton() {
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('community_has_liked');
    if (saved === 'true') {
      setHasLiked(true);
    }
  }, []);

  const handleLike = (e) => {
    // If they already liked, we can let them unlike, or just keep it checked
    const isChecked = e.target.checked;
    setHasLiked(isChecked);
    localStorage.setItem('community_has_liked', isChecked);
  };

  return (
    <div className="like-button-container mt-4">
      <div className="like-button">
        <input 
          className="on" 
          id="heart" 
          type="checkbox" 
          checked={hasLiked}
          onChange={handleLike}
        />
        <label className="like" htmlFor="heart">
          <svg
            className="like-icon"
            fillRule="nonzero"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
            ></path>
          </svg>
          <span className="like-text">Likes</span>
        </label>
        <span className="like-count one">68</span>
        <span className="like-count two">69</span>
      </div>
    </div>
  );
}
