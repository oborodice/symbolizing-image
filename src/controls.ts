export function bindRange(
  input: HTMLInputElement,
  label: HTMLElement,
  format: (value: number) => string,
  onChange: (value: number) => void,
): (value: number) => void {
  function apply(value: number): void {
    input.value = String(value)
    label.textContent = format(value)
    onChange(value)
  }
  input.addEventListener('input', () => apply(Number(input.value)))
  return apply
}

export function bindCheckbox(
  input: HTMLInputElement,
  onChange: (checked: boolean) => void,
): (checked: boolean) => void {
  function apply(checked: boolean): void {
    input.checked = checked
    onChange(checked)
  }
  input.addEventListener('change', () => apply(input.checked))
  return apply
}
