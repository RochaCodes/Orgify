import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
          spotify organizer
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          O teu HUD para a biblioteca Spotify
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Liga a tua conta Spotify para organizar playlists, ver o que estás a
          ouvir em tempo real e receber sugestões baseadas nas tuas coleções.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("spotify", { redirectTo: "/dashboard" });
        }}
      >
        <Button type="submit" size="lg" className="gap-2">
          Entrar com Spotify
        </Button>
      </form>
    </div>
  );
}
