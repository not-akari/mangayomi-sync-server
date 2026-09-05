import Image from "next/image";

// Shared side panel for the login, register, and setup pages.
export function AuthHero({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4 lg:max-w-md">
      <Image
        src="/icon.png"
        alt=""
        width={56}
        height={56}
        className="rounded-2xl"
      />
      <h1 className="text-2xl font-bold tracking-tight text-balance lg:text-3xl">
        {title}
      </h1>
      <p className="max-w-[55ch] text-sm text-muted-foreground lg:text-base">
        {description}
      </p>
    </div>
  );
}
