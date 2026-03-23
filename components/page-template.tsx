import { Card, CardContent } from "@/components/ui/card";

type PageTemplateProps = {
  message: string;
};

export function PageTemplate({ message }: PageTemplateProps) {
  return (
    <Card className="flex min-h-[60svh] items-center justify-center">
      <CardContent className="pt-6 text-center">
        <p className="max-w-xl text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
