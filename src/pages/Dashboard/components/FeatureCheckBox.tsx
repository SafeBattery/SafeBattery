interface FeatureCheckBoxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export default function FeatureCheckBox({ label, checked, onChange }: FeatureCheckBoxProps) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
