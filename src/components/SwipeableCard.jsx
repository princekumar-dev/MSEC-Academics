import { useState, useRef, useEffect } from 'react'

/**
 * SwipeableCard - A wrapper component that enables swipe gestures on marksheet cards
 * Swipe left to reveal quick action buttons (View, Approve, Reject)
 * 
 * Props:
 * - children: Card content to display
 * - actions: Array of action objects {label, icon, onClick, className}
 * - onSwipe: Optional callback when swipe is triggered
 */
function SwipeableCard({ children, actions = [], onSwipe }) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const currentX = useRef(0)
  const containerRef = useRef(null)

  const SWIPE_THRESHOLD = 50 // Minimum swipe distance to trigger
  const MAX_SWIPE = 280 // Maximum swipe distance
  const ACTION_WIDTH = 70 // Width of each action button

  useEffect(() => {
    // Close swipe when clicking outside
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target) && isRevealed) {
        closeSwipe()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isRevealed])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!isSwiping) return

    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = touchX - touchStartX.current
    const deltaY = touchY - touchStartY.current

    // Only allow horizontal swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      e.preventDefault()
      
      // Calculate swipe offset with resistance
      let newOffset = Math.max(deltaX, -MAX_SWIPE)
      currentX.current = newOffset
      setSwipeOffset(newOffset)
    }
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)

    // If swiped past threshold, reveal actions
    if (Math.abs(currentX.current) > SWIPE_THRESHOLD) {
      const revealWidth = Math.min(actions.length * ACTION_WIDTH, MAX_SWIPE)
      setSwipeOffset(-revealWidth)
      setIsRevealed(true)
      if (onSwipe) onSwipe()
    } else {
      closeSwipe()
    }
  }

  const closeSwipe = () => {
    setSwipeOffset(0)
    setIsRevealed(false)
    currentX.current = 0
  }

  const handleActionClick = (action) => {
    closeSwipe()
    if (action.onClick) {
      action.onClick()
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl shadow-sm border border-gray-200"
      style={{ 
        touchAction: 'pan-y',
        transform: 'translateZ(0)', /* Force GPU acceleration */
        willChange: isSwiping ? 'transform' : 'auto'
      }}
    >
      {/* Action buttons (revealed on swipe) */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2.5 px-3 z-0 bg-gradient-to-l from-white via-gray-50/95 to-transparent backdrop-blur-sm">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleActionClick(action)}
            className={`flex items-center justify-center w-[52px] h-[52px] rounded-xl backdrop-blur-md bg-white shadow-md hover:shadow-xl transition-all duration-200 active:scale-90 hover:scale-105 border-2 ${
              action.className || 'border-gray-200 text-gray-600'
            }`}
            style={{ 
              minWidth: '52px',
              minHeight: '52px'
            }}
            title={action.label}
          >
            {action.icon && <span className="text-[26px] leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>{action.icon}</span>}
          </button>
        ))}
      </div>

      {/* Card content (swipeable) */}
      <div
        className="relative z-10 bg-white rounded-xl"
        style={{
          transform: `translate3d(${swipeOffset}px, 0, 0)`, /* Use translate3d for GPU acceleration */
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isSwiping ? 'transform' : 'auto',
          boxShadow: isRevealed ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeableCard
