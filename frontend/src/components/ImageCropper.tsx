import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Slider, Typography } from '@mui/material';
import { getCroppedImg } from '../lib/cropImage';

interface ImageCropperProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropCompleteAction: (croppedImageBase64: string) => void;
}

export default function ImageCropper({ open, imageSrc, onClose, onCropCompleteAction }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    try {
        if (!imageSrc || !croppedAreaPixels) return;
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (croppedImage) {
            onCropCompleteAction(croppedImage);
        }
    } catch (e) {
        console.error(e);
        alert('Error al recortar la imagen');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Recortar Foto de Perfil</DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: 400, position: 'relative', bgcolor: '#333' }}>
        {imageSrc && (
            <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
            />
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', p: 3, alignItems: 'stretch' }}>
        <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">Zoom</Typography>
            <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e, zoom) => setZoom(Number(zoom))}
                sx={{ color: '#FF6B00' }}
            />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={onClose} color="inherit" sx={{ fontWeight: 'bold' }}>Cancelar</Button>
            <Button onClick={handleCrop} variant="contained" sx={{ bgcolor: '#FF6B00', '&:hover': { bgcolor: '#E55A00' }, fontWeight: 'bold' }}>
                Aplicar Recorte
            </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
