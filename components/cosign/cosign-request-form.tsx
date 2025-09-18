"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, FileSignature, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/shared/use-toast";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";
import { CoSignerSelect } from "./cosigner-select";

const cosignRequestSchema = z.object({
  cosignerId: z.string().min(1, "Co-signer is required"),
});

type CoSignRequestForm = z.infer<typeof cosignRequestSchema>;

interface CoSignRequestFormProps {
  administrationId: string;
  medicationName: string;
  animalName: string;
  dose: string;
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CoSignRequestForm({
  administrationId,
  medicationName,
  animalName,
  dose,
  onSuccess,
  disabled = false,
  className,
}: CoSignRequestFormProps) {
  const [open, setOpen] = useState(false);
  const { selectedHousehold } = useApp();
  const { toast } = useToast();

  const form = useForm<CoSignRequestForm>({
    defaultValues: {
      cosignerId: "",
    },
    mode: "onChange",
    resolver: zodResolver(cosignRequestSchema),
  });

  // Create co-sign request mutation
  const createRequestMutation = trpc.cosigner.createRequest.useMutation({
    onError: (error) => {
      toast({
        description: error.message,
        title: "Error sending request",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        description: "The co-sign request has been sent successfully.",
        title: "Co-sign request sent",
      });
      form.reset();
      setOpen(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (data: CoSignRequestForm) => {
    if (!selectedHousehold) return;

    createRequestMutation.mutate({
      administrationId,
      cosignerId: data.cosignerId,
      householdId: selectedHousehold.id,
    });
  };

  if (!selectedHousehold) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a household to request co-signatures.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className={cn("flex items-center gap-2", className)}
          disabled={disabled}
          variant="outline"
        >
          <FileSignature className="h-4 w-4" />
          Request Co-signature
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Request Co-signature
          </DialogTitle>
          <DialogDescription>
            Select a household member to co-sign this medication administration.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-base">Administration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">
                  Animal:
                </span>
                <p className="font-medium">{animalName}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Dose:</span>
                <p className="font-medium">{dose}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Medication:
              </span>
              <p className="font-medium">{medicationName}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="cosignerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Co-signer</FormLabel>
                  <FormControl>
                    <CoSignerSelect
                      disabled={createRequestMutation.isPending}
                      onValueChange={field.onChange}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>
                    Select a household owner or caregiver to co-sign this
                    administration.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The co-signer will receive a notification and have 24 hours to
                approve or reject this request.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={createRequestMutation.isPending}
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={
                  !form.formState.isValid || createRequestMutation.isPending
                }
                type="submit"
              >
                {createRequestMutation.isPending ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
