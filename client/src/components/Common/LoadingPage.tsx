
import React from 'react';

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <div className="comic-brutalist-loader">
        <div className="loader-container">
          <div className="comic-panel">
            <div className="speech-bubble">
              <span className="loading-text">Tu es au courant..?</span>
              <div className="dots">
                <span className="dot">!</span>
                <span className="dot">?</span>
                <span className="dot">!</span>
              </div>
            </div>
            <div className="comic-character">
              <div className="character-head"></div>
              <div className="character-body"></div>
              <div className="character-eyes">
                <div className="eye left"></div>
                <div className="eye right"></div>
              </div>
              <div className="character-mouth"></div>
            </div>
            <div className="starburst">
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
              <div className="star-spike"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
