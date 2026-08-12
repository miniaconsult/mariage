import { LeafDivider } from "@/components/LeafDivider";
import { UploadZone } from "@/components/UploadZone";
import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-xl">
        <div className="rounded-[2rem] border border-sage-200 bg-cream/80 px-6 py-10 shadow-[0_8px_40px_-12px_rgba(80,97,62,0.25)] sm:px-10 sm:py-14">
          <div className="text-center">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-sage-500">
              {siteConfig.weddingDate}
            </p>

            <h1 className="mt-3 font-script text-5xl leading-tight text-sage-700 sm:text-6xl">
              {siteConfig.coupleNames}
            </h1>

            <div className="mt-4">
              <LeafDivider />
            </div>

            <p className="mx-auto mt-5 max-w-md font-display text-lg leading-relaxed text-sage-800 sm:text-xl">
              {siteConfig.welcomeMessage}
            </p>
          </div>

          <div className="mt-10">
            <UploadZone maxFileSizeMb={siteConfig.maxFileSizeMb} />
          </div>

          <p className="mx-auto mt-8 max-w-sm text-center font-sans text-xs leading-relaxed text-sage-500">
            {siteConfig.footerNote}
          </p>
        </div>

        <p className="mt-6 text-center font-script text-2xl text-sage-500">
          avec tout notre amour 🌿
        </p>
      </div>
    </main>
  );
}
