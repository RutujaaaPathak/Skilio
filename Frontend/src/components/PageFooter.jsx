export default function PageFooter() {
  return (
    <footer className="w-full py-md mt-lg border-t border-outline-variant bg-surface flex flex-col md:flex-row justify-between items-center px-gutter gap-sm">
      <div className="flex flex-col items-center md:items-start">
        <span className="font-bold text-on-surface">Skillo</span>
        <span className="text-label-sm text-on-surface-variant">© 2024 Skillo. Secure Examination Environment.</span>
      </div>
      <div className="flex gap-md">
        <a className="text-label-sm text-on-surface-variant hover:text-primary hover:underline" href="#">Support</a>
        <a className="text-label-sm text-on-surface-variant hover:text-primary hover:underline" href="#">Privacy Policy</a>
        <a className="text-label-sm text-on-surface-variant hover:text-primary hover:underline" href="#">Security Standards</a>
      </div>
    </footer>
  );
}
