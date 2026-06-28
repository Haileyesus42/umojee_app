import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import type * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Path } from 'react-native-svg';

import { styles } from '../../theme/styles';

export type PendingProfilePhoto = {
  fileName?: string | null;
  height?: number;
  source: 'camera' | 'gallery';
  uri: string;
  width?: number;
};

export type Point = {
  x: number;
  y: number;
};

export type CropLayout = {
  frameSize: number;
  stageHeight: number;
  stageWidth: number;
};

export const PROFILE_PHOTO_SIZE = 512;
export const MIN_PHOTO_ZOOM = 1;
export const MAX_PHOTO_ZOOM = 4;
export const PHOTO_ZOOM_STEP = 0.25;
export const DEFAULT_CROP_LAYOUT: CropLayout = {
  frameSize: 280,
  stageHeight: 520,
  stageWidth: 390,
};

export function PhotoCropModal({
  imageUri,
  onApply,
  onCancel,
  onLayoutChange,
  onOffsetChange,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  offset,
  uploading,
  visible,
  zoom,
}: {
  imageUri: string | null;
  onApply: () => void;
  onCancel: () => void;
  onLayoutChange: (layout: CropLayout) => void;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  offset: Point;
  uploading: boolean;
  visible: boolean;
  zoom: number;
}) {
  const [stageLayout, setStageLayout] = useState<CropLayout>(DEFAULT_CROP_LAYOUT);
  const gesture = useCropCircleGesture({
    frameOffset: offset,
    layout: stageLayout,
    onFrameOffsetChange: onOffsetChange,
    onZoomChange,
    zoom,
  });

  const handleStageLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    const nextLayout = {
      frameSize: Math.max(220, Math.min(width - 32, height - 128)),
      stageHeight: height,
      stageWidth: width,
    };

    setStageLayout(nextLayout);
    onLayoutChange(nextLayout);
    onOffsetChange(constrainCropFrameOffset(offset, nextLayout));
  };

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.profilePhotoModalOverlay}>
        <View style={styles.profilePhotoModalCard}>
          <View style={styles.profilePhotoModalHeader}>
            <Pressable
              accessibilityLabel="Cancel profile photo crop"
              accessibilityRole="button"
              disabled={uploading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.profilePhotoIconButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <CloseIcon />
            </Pressable>
            <Text style={styles.profilePhotoModalTitle}>Crop Photo</Text>
            <Pressable
              accessibilityLabel="Apply profile photo crop"
              accessibilityRole="button"
              disabled={uploading}
              onPress={onApply}
              style={({ pressed }) => [
                styles.profilePhotoApplyButton,
                uploading && styles.profilePictureButtonDisabled,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profilePhotoApplyButtonText}>
                {uploading ? 'Saving...' : 'Apply'}
              </Text>
            </Pressable>
          </View>

          <View
            onLayout={handleStageLayout}
            style={styles.profilePhotoCropStage}
            {...gesture.panHandlers}
          >
            {imageUri ? (
              <Image
                resizeMode="cover"
                source={{ uri: imageUri }}
                style={[
                  styles.profilePhotoCropImage,
                  {
                    transform: [{ scale: zoom }],
                  },
                ]}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[
                styles.profilePhotoCropFrame,
                {
                  borderRadius: stageLayout.frameSize / 2,
                  height: stageLayout.frameSize,
                  left: (stageLayout.stageWidth - stageLayout.frameSize) / 2,
                  top: (stageLayout.stageHeight - stageLayout.frameSize) / 2,
                  transform: [{ translateX: offset.x }, { translateY: offset.y }],
                  width: stageLayout.frameSize,
                },
              ]}
            />
            {uploading ? (
              <View style={styles.profilePhotoBusyOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : null}
          </View>

          <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} zoom={zoom} />
        </View>
      </View>
    </Modal>
  );
}

export function PhotoPreviewModal({
  imageSource,
  offset,
  onClose,
  onOffsetChange,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  visible,
  zoom,
}: {
  imageSource: ImageSourcePropType;
  offset: Point;
  onClose: () => void;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  visible: boolean;
  zoom: number;
}) {
  const gesture = useImageTransformGesture({
    constrainOffset: (nextOffset, nextZoom) =>
      nextZoom <= MIN_PHOTO_ZOOM ? { x: 0, y: 0 } : nextOffset,
    offset,
    onOffsetChange,
    onZoomChange,
    zoom,
  });

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.profilePhotoViewerOverlay}>
        <View style={styles.profilePhotoViewerHeader}>
          <Text style={styles.profilePhotoViewerTitle}>Profile Photo</Text>
          <Pressable
            accessibilityLabel="Close profile photo"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.profilePhotoViewerClose,
              pressed && styles.pressedFeedback,
            ]}
          >
            <CloseIcon color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.profilePhotoViewerStage} {...gesture.panHandlers}>
          <Image
            resizeMode="contain"
            source={imageSource}
            style={[
              styles.profilePhotoViewerImage,
              {
                transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale: zoom }],
              },
            ]}
          />
        </View>

        <View style={styles.profilePhotoViewerControls}>
          <ZoomControls inverse onZoomIn={onZoomIn} onZoomOut={onZoomOut} zoom={zoom} />
        </View>
      </View>
    </Modal>
  );
}

function ZoomControls({
  inverse = false,
  onZoomIn,
  onZoomOut,
  zoom,
}: {
  inverse?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}) {
  return (
    <View
      style={[styles.profilePhotoZoomControls, inverse && styles.profilePhotoZoomControlsInverse]}
    >
      <Pressable
        accessibilityLabel="Zoom out"
        accessibilityRole="button"
        disabled={zoom <= MIN_PHOTO_ZOOM}
        onPress={onZoomOut}
        style={({ pressed }) => [
          styles.profilePhotoZoomButton,
          inverse && styles.profilePhotoZoomButtonInverse,
          zoom <= MIN_PHOTO_ZOOM && styles.profilePictureButtonDisabled,
          pressed && styles.pressedFeedback,
        ]}
      >
        <Text
          style={[
            styles.profilePhotoZoomButtonText,
            inverse && styles.profilePhotoZoomButtonTextInverse,
          ]}
        >
          -
        </Text>
      </Pressable>
      <Text style={[styles.profilePhotoZoomText, inverse && styles.profilePhotoZoomTextInverse]}>
        {Math.round(zoom * 100)}%
      </Text>
      <Pressable
        accessibilityLabel="Zoom in"
        accessibilityRole="button"
        disabled={zoom >= MAX_PHOTO_ZOOM}
        onPress={onZoomIn}
        style={({ pressed }) => [
          styles.profilePhotoZoomButton,
          inverse && styles.profilePhotoZoomButtonInverse,
          zoom >= MAX_PHOTO_ZOOM && styles.profilePictureButtonDisabled,
          pressed && styles.pressedFeedback,
        ]}
      >
        <Text
          style={[
            styles.profilePhotoZoomButtonText,
            inverse && styles.profilePhotoZoomButtonTextInverse,
          ]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

function useCropCircleGesture({
  frameOffset,
  layout,
  onFrameOffsetChange,
  onZoomChange,
  zoom,
}: {
  frameOffset: Point;
  layout: CropLayout;
  onFrameOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}) {
  const startDistanceRef = useRef(0);
  const startFrameOffsetRef = useRef<Point>(frameOffset);
  const startZoomRef = useRef(zoom);
  const frameOffsetRef = useRef(frameOffset);
  const layoutRef = useRef(layout);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    frameOffsetRef.current = frameOffset;
  }, [frameOffset]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;

          startFrameOffsetRef.current = frameOffsetRef.current;
          startZoomRef.current = zoomRef.current;
          startDistanceRef.current = getTouchDistance(touches);
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2) {
            const nextDistance = getTouchDistance(touches);
            const nextZoom =
              startDistanceRef.current > 0
                ? clampZoom(startZoomRef.current * (nextDistance / startDistanceRef.current))
                : startZoomRef.current;

            onZoomChange(nextZoom);
            return;
          }

          const nextFrameOffset = {
            x: startFrameOffsetRef.current.x + gestureState.dx,
            y: startFrameOffsetRef.current.y + gestureState.dy,
          };

          onFrameOffsetChange(constrainCropFrameOffset(nextFrameOffset, layoutRef.current));
        },
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [onFrameOffsetChange, onZoomChange],
  );
}

function useImageTransformGesture({
  constrainOffset,
  offset,
  onOffsetChange,
  onZoomChange,
  zoom,
}: {
  constrainOffset: (offset: Point, zoom: number) => Point;
  offset: Point;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}) {
  const startDistanceRef = useRef(0);
  const startCenterRef = useRef<Point>({ x: 0, y: 0 });
  const startOffsetRef = useRef<Point>(offset);
  const startZoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;

          startOffsetRef.current = offsetRef.current;
          startZoomRef.current = zoomRef.current;
          startCenterRef.current = getTouchCenter(touches);
          startDistanceRef.current = getTouchDistance(touches);
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2) {
            const nextDistance = getTouchDistance(touches);
            const nextCenter = getTouchCenter(touches);
            const nextZoom =
              startDistanceRef.current > 0
                ? clampZoom(startZoomRef.current * (nextDistance / startDistanceRef.current))
                : startZoomRef.current;
            const nextOffset = {
              x: startOffsetRef.current.x + (nextCenter.x - startCenterRef.current.x),
              y: startOffsetRef.current.y + (nextCenter.y - startCenterRef.current.y),
            };

            onZoomChange(nextZoom);
            onOffsetChange(constrainOffset(nextOffset, nextZoom));
            return;
          }

          const nextOffset = {
            x: startOffsetRef.current.x + gestureState.dx,
            y: startOffsetRef.current.y + gestureState.dy,
          };

          onOffsetChange(constrainOffset(nextOffset, zoomRef.current));
        },
        onPanResponderTerminationRequest: () => true,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [constrainOffset, onOffsetChange, onZoomChange],
  );
}

export function getProfilePhotoCropAction(
  photo: PendingProfilePhoto,
  zoom: number,
  frameOffset: Point,
  layout: CropLayout,
): ImageManipulator.Action | null {
  if (!photo.width || !photo.height) {
    return null;
  }

  const imageScale = getCoverScale(photo, layout) * zoom;
  const displayWidth = photo.width * imageScale;
  const displayHeight = photo.height * imageScale;
  const imageLeft = layout.stageWidth / 2 - displayWidth / 2;
  const imageTop = layout.stageHeight / 2 - displayHeight / 2;
  const frameLeft = (layout.stageWidth - layout.frameSize) / 2 + frameOffset.x;
  const frameTop = (layout.stageHeight - layout.frameSize) / 2 + frameOffset.y;
  const cropSize = Math.max(1, Math.round(layout.frameSize / imageScale));
  const originX = Math.round(
    clamp((frameLeft - imageLeft) / imageScale, 0, photo.width - cropSize),
  );
  const originY = Math.round(clamp((frameTop - imageTop) / imageScale, 0, photo.height - cropSize));

  return {
    crop: {
      height: cropSize,
      originX,
      originY,
      width: cropSize,
    },
  };
}

export function clampZoom(value: number): number {
  return Math.min(MAX_PHOTO_ZOOM, Math.max(MIN_PHOTO_ZOOM, Number(value.toFixed(2))));
}

export function constrainCropFrameOffset(offset: Point, layout: CropLayout): Point {
  const maxX = Math.max(0, (layout.stageWidth - layout.frameSize) / 2);
  const maxY = Math.max(0, (layout.stageHeight - layout.frameSize) / 2);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

function getCoverScale(photo: PendingProfilePhoto, layout: CropLayout): number {
  if (!photo.width || !photo.height) {
    return 1;
  }

  return Math.max(layout.stageWidth / photo.width, layout.stageHeight / photo.height);
}

function getTouchCenter(touches: readonly { pageX: number; pageY: number }[]): Point {
  if (touches.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = touches.reduce(
    (acc, touch) => ({
      x: acc.x + touch.pageX,
      y: acc.y + touch.pageY,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / touches.length,
    y: total.y / touches.length,
  };
}

function getTouchDistance(touches: readonly { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) {
    return 0;
  }

  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function CloseIcon({ color = '#0A0A0A' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeLinecap="round" strokeWidth={2.2} />
    </Svg>
  );
}
