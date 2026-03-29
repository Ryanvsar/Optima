import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import './ImageCropModal.css'

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
  })
}

export default function ImageCropModal({ imageSrc, onClose, onCropDone, shape = 'round' }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      await onCropDone(file)
    } catch {
      // handled by parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="crop-overlay" onClick={onClose}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-header">
          <h3>Edit Photo</h3>
          <button className="crop-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="crop-controls">
          <label className="zoom-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </label>
          <input
            type="range"
            className="zoom-slider"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="crop-actions">
          <button className="crop-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="crop-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
