import {
  BoundingBox,
  CaptionItemState,
  CaptionLayoutConfig,
  ContainerEvent,
  LayoutMode,
  MeasuredCaption,
} from './types';

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const rotatePoint = (x: number, y: number, originX: number, originY: number, degrees: number) => {
  const radians = degreesToRadians(degrees);
  const translatedX = x - originX;
  const translatedY = y - originY;
  const rotatedX = translatedX * Math.cos(radians) - translatedY * Math.sin(radians);
  const rotatedY = translatedX * Math.sin(radians) + translatedY * Math.cos(radians);

  return {
    x: rotatedX + originX,
    y: rotatedY + originY,
  };
};

const getRotatedCorners = (item: CaptionItemState) => {
  const corners = [
    {x: item.x, y: item.y},
    {x: item.x + item.width, y: item.y},
    {x: item.x + item.width, y: item.y + item.height},
    {x: item.x, y: item.y + item.height},
  ];

  return corners.map((corner) =>
    rotatePoint(corner.x, corner.y, item.x, item.y, item.rotation),
  );
};

export const getBoundingBox = (items: CaptionItemState[]): BoundingBox => {
  if (items.length === 0) {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };
  }

  const corners = items.flatMap(getRotatedCorners);
  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  const top = Math.min(...corners.map((corner) => corner.y));
  const bottom = Math.max(...corners.map((corner) => corner.y));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

const cloneItem = (item: CaptionItemState): CaptionItemState => ({...item, lines: [...item.lines]});

const rotateItemsAroundAnchor = (
  items: CaptionItemState[],
  originX: number,
  originY: number,
  degrees: number,
) => {
  return items.map((item) => {
    const rotatedOrigin = rotatePoint(item.x, item.y, originX, originY, degrees);

    return {
      ...cloneItem(item),
      x: rotatedOrigin.x,
      y: rotatedOrigin.y,
      rotation: item.rotation + degrees,
    };
  });
};

const translateItems = (items: CaptionItemState[], deltaX: number, deltaY: number) => {
  return items.map((item) => ({
    ...cloneItem(item),
    x: item.x + deltaX,
    y: item.y + deltaY,
  }));
};

const applyMode = (
  items: CaptionItemState[],
  config: CaptionLayoutConfig,
  bbox: BoundingBox,
  translateDistancePx?: number,
): CaptionItemState[] => {
  if (config.mode === 'rotate_ccw_90') {
    return rotateItemsAroundAnchor(items, bbox.left, bbox.bottom, -90);
  }

  if (config.mode === 'rotate_cw_90') {
    return rotateItemsAroundAnchor(items, bbox.right, bbox.bottom, 90);
  }

  return translateItems(items, 0, -(translateDistancePx ?? bbox.height * 0.7));
};

const interpolateNumber = (from: number, to: number, progress: number) => from + (to - from) * progress;

const interpolateItems = (fromItems: CaptionItemState[], toItems: CaptionItemState[], progress: number) => {
  const fromMap = new Map(fromItems.map((item) => [item.id, item]));
  const toMap = new Map(toItems.map((item) => [item.id, item]));
  const ids = Array.from(new Set([...fromMap.keys(), ...toMap.keys()]));

  return ids.flatMap((id) => {
    const fromItem = fromMap.get(id);
    const toItem = toMap.get(id);

    if (!fromItem || !toItem) {
      return [];
    }

    return [
      {
        ...cloneItem(toItem),
        x: interpolateNumber(fromItem.x, toItem.x, progress),
        y: interpolateNumber(fromItem.y, toItem.y, progress),
        rotation: interpolateNumber(fromItem.rotation, toItem.rotation, progress),
      },
    ];
  });
};

export const buildContainerEvents = (
  captions: MeasuredCaption[],
  layoutMap: Record<string, CaptionLayoutConfig>,
  activeAnchorX: number,
  activeAnchorY: number,
): ContainerEvent[] => {
  const events: ContainerEvent[] = [];
  let settledItems: CaptionItemState[] = [];

  for (let index = 0; index < captions.length - 1; index += 1) {
    const enteringCaption = captions[index];
    const nextCaption = captions[index + 1];
    const config = layoutMap[enteringCaption.layoutKey];
    const nextConfig = layoutMap[nextCaption.layoutKey];

    if (!config) {
      throw new Error(`Missing layout config for key "${enteringCaption.layoutKey}"`);
    }

    if (!nextConfig) {
      throw new Error(`Missing layout config for key "${nextCaption.layoutKey}"`);
    }

    const enteringItem: CaptionItemState = {
      id: enteringCaption.id,
      text: enteringCaption.text,
      layoutKey: enteringCaption.layoutKey,
      lines: enteringCaption.lines,
      fontSize: enteringCaption.fontSize,
      lineHeight: enteringCaption.lineHeight,
      width: enteringCaption.width,
      height: enteringCaption.height,
      x: activeAnchorX - enteringCaption.width / 2,
      y: activeAnchorY - enteringCaption.height / 2,
      rotation: 0,
    };
    const fromItems = [...settledItems.map(cloneItem), enteringItem];
    const bbox = getBoundingBox(fromItems);
    const nextCaptionTop = activeAnchorY - nextCaption.height / 2;
    const translateDistancePx =
      config.mode === 'translate_up'
        ? config.translateDistancePx ?? Math.max(0, bbox.bottom - nextCaptionTop)
        : config.translateDistancePx;
    const toItems = applyMode(fromItems, config, bbox, translateDistancePx);

    events.push({
      key: enteringCaption.id,
      triggerFrame: nextCaption.startFrame,
      transitionFrames: nextConfig.enterDurationFrames,
      mode: config.mode,
      translateDistancePx,
      fromBox: bbox,
      fromItems,
      toItems,
    });

    settledItems = toItems.map(cloneItem);
  }

  return events;
};

export const resolveContainerItems = (events: ContainerEvent[], frame: number) => {
  if (events.length === 0 || frame < events[0].triggerFrame) {
    return [];
  }

  let settledItems = events[0].fromItems.filter(() => false) as CaptionItemState[];

  for (const event of events) {
    if (frame < event.triggerFrame) {
      break;
    }

    const transitionEnd = event.triggerFrame + event.transitionFrames;

    if (frame < transitionEnd) {
      const progress = (frame - event.triggerFrame) / Math.max(1, event.transitionFrames);
      return interpolateItems(event.fromItems, event.toItems, progress);
    }

    settledItems = event.toItems.map(cloneItem);
  }

  return settledItems;
};

const getTransformOrigin = (mode: LayoutMode) => {
  if (mode === 'rotate_ccw_90') {
    return '0% 100%';
  }

  if (mode === 'rotate_cw_90') {
    return '100% 100%';
  }

  return '50% 50%';
};

export const resolveContainerVisualState = (events: ContainerEvent[], frame: number) => {
  if (events.length === 0 || frame < events[0].triggerFrame) {
    return null;
  }

  let activeEvent = events[0];
  let progress = 1;

  for (const event of events) {
    if (frame < event.triggerFrame) {
      break;
    }

    activeEvent = event;
    const transitionEnd = event.triggerFrame + event.transitionFrames;

    if (frame < transitionEnd) {
      progress = (frame - event.triggerFrame) / Math.max(1, event.transitionFrames);
      break;
    }

    progress = 1;
  }

  const {fromBox, mode, translateDistancePx} = activeEvent;
  const rotateTo =
    mode === 'rotate_ccw_90' ? -90 : mode === 'rotate_cw_90' ? 90 : 0;
  const translateYTo =
    mode === 'translate_up' ? -(translateDistancePx ?? fromBox.height * 0.7) : 0;

  return {
    event: activeEvent,
    progress,
    left: fromBox.left,
    top: fromBox.top,
    width: fromBox.width,
    height: fromBox.height,
    rotation: rotateTo * progress,
    translateY: translateYTo * progress,
    transformOrigin: getTransformOrigin(mode),
  };
};
