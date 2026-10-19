export function Header() {
  return (
    <header className="flex flex-col items-start gap-6 px-2 pt-2 pb-4 desk:flex-row desk:items-end desk:justify-between">
      <div>
        <p className="text-xs tracking-brand text-primary uppercase">Automatic vendor</p>
        <h1 className="font-display text-display font-medium tracking-tight">Vend</h1>
      </div>
      <p className="max-w-note text-left text-m text-muted desk:text-right">
        Three purchases per name every three seconds. Change is the fewest coins the machine can spare.
      </p>
    </header>
  );
}
