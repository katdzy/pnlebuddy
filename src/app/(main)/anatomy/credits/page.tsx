import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Anatomy credits" };

/** The attribution BodyParts3D's licence asks for, and what was done to the models. */
export default function AnatomyCreditsPage() {
  return (
    <article className="max-w-[62ch] pt-8">
      <p className="text-meta text-ink-muted">
        <Link href="/anatomy">Anatomy</Link> › Credits
      </p>
      <h1 className="mt-2 font-display text-headline font-bold">Credits for the 3D models</h1>

      <p className="mt-6 text-lead">
        BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.
      </p>
      <p className="mt-4 text-ink-soft">
        Source:{" "}
        <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">BodyParts3D 4.0 downloads</a> (IS-A
        meshes, 99% reduction). Licence:{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International</a>.
      </p>

      <h2 className="mt-12 text-lead font-bold">Changes made for PNLE Buddy</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
        <li>Grouped into body systems, converted to glTF, simplified and compressed so they load on an iPad.</li>
        <li>Each structure keeps its English name from BodyParts3D (Foundational Model of Anatomy terms).</li>
        <li>
          Links to definitions point to her A&amp;P textbook&apos;s glossary. They&apos;re found by matching names, and
          each one says whether the match is exact, a broader term, or the larger structure it&apos;s part of.
        </li>
      </ul>

      <h2 className="mt-12 text-lead font-bold">What the models don&apos;t have</h2>
      <p className="mt-3 text-ink-soft">
        BodyParts3D models a male body. It has no female reproductive organs, no lung tissue (the lungs show as their
        airways and vessels), no thyroid gland, no lymph nodes, no spinal cord (only its central canal) and no spinal
        nerves. For those, use your book&apos;s figures.
      </p>
    </article>
  );
}
