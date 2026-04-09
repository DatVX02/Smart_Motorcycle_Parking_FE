export const PAGE_SIZE = 20;

export const RECOGNITION_TYPE_OPTIONS = [
  { value: "FaceCheckIn", label: "Khuôn mặt vào" },
  { value: "FaceCheckOut", label: "Khuôn mặt ra" },
  { value: "PlateCheckIn", label: "Biển số vào" },
  { value: "PlateCheckOut", label: "Biển số ra" },
];

export const RECOGNITION_TYPE_LABELS = Object.fromEntries(
  RECOGNITION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const RECOGNITION_TYPE_BADGE_CLASSES = {
  FaceCheckIn: "bg-green-100 text-green-700 border border-green-200",
  FaceCheckOut: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  PlateCheckIn: "bg-blue-100 text-blue-700 border border-blue-200",
  PlateCheckOut: "bg-purple-100 text-purple-700 border border-purple-200",
};
