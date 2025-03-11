// src/components/ai/AIFeedbackCollector.tsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, X } from 'react-feather';
import { aiAnalytics } from '../../lib/ai/aiAnalytics';

interface AIFeedbackCollectorProps {
  requestId: string;
  onFeedbackSubmitted?: (rating: number, comment?: string) => void;
  compact?: boolean;
}

const AIFeedbackCollector: React.FC<AIFeedbackCollectorProps> = ({
  requestId,
  onFeedbackSubmitted,
  compact = false
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const handleFeedback = (value: number) => {
    setRating(value);
    aiAnalytics.trackFeedback(requestId, value);
    
    if (value < 4) {
      setShowCommentForm(true);
    } else {
      setSubmitted(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted(value);
    }
  };
  
  const submitComment = () => {
    if (rating !== null) {
      aiAnalytics.trackFeedback(requestId, rating, comment);
      if (onFeedbackSubmitted) onFeedbackSubmitted(rating, comment);
      setSubmitted(true);
      setShowCommentForm(false);
    }
  };
  
  if (submitted) {
    return compact ? (
      <div className="text-xs text-green-600">Thanks for your feedback!</div>
    ) : (
      <div className="p-2 text-sm text-green-600 bg-green-50 rounded-md">
        Thanks for your feedback!
      </div>
    );
  }
  
  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      {!showCommentForm ? (
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">Was this helpful?</span>
          <button
            onClick={() => handleFeedback(5)}
            className="p-1 hover:bg-green-50 rounded-full"
            aria-label="Thumbs up"
          >
            <ThumbsUp size={compact ? 14 : 18} className="text-gray-500 hover:text-green-600" />
          </button>
          <button
            onClick={() => handleFeedback(1)}
            className="p-1 hover:bg-red-50 rounded-full"
            aria-label="Thumbs down"
          >
            <ThumbsDown size={compact ? 14 : 18} className="text-gray-500 hover:text-red-600" />
          </button>
        </div>
      ) : (
        <div className="mt-2 p-3 bg-blue-50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-blue-700">How could this be improved?</span>
            <button
              onClick={() => setShowCommentForm(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Your feedback helps us improve..."
            className="w-full p-2 border border-blue-200 rounded-md text-sm mt-1 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitComment}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <MessageCircle size={14} className="mr-1" />
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFeedbackCollector;