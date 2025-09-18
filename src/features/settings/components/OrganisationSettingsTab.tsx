import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { mockApi } from '@/mocks/api';
import type { OrgSettings } from '@/mocks/types';
import { useToast } from '@/hooks/use-toast';
import { Upload, ImageIcon } from 'lucide-react';
import { fileToDataUrl } from '@/utils/file';

const REQUIRED_MESSAGE = 'This field is required.';

export const OrganisationSettingsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => mockApi.getOrgSettings(),
  });

  const form = useForm<OrgSettings>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      tax_id: '',
      country: '',
      city: '',
      address: '',
      logoDataUrl: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (data) {
      form.reset(data);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<OrgSettings>) => mockApi.saveOrgSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['org-settings'], updated);
      form.reset(updated);
      toast({ title: 'Saved', description: 'Organisation settings have been updated.' });
    },
    onError: () => {
      toast({ title: 'Save failed', description: 'We could not save your changes just now.', variant: 'destructive' });
    },
  });

  const handleSubmit = (values: OrgSettings) => {
    saveMutation.mutate(values);
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Unsupported file', description: 'Please upload a PNG, JPG, or SVG logo.', variant: 'destructive' });
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      saveMutation.mutate(
        { logoDataUrl: dataUrl },
        {
          onSuccess: (updated) => {
            queryClient.setQueryData(['org-settings'], updated);
            toast({ title: 'Logo updated', description: 'Your organisation logo now appears across the workspace.' });
          },
        },
      );
    } catch (error) {
      console.error('Logo upload failed', error);
      toast({ title: 'Upload failed', description: 'We could not read that file. Try a smaller logo.', variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Organisation profile</CardTitle>
          <CardDescription>Update the details that appear on your documents and workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: REQUIRED_MESSAGE }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ProList Manufacturing" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CM-PL-009988" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    validate: (value) => {
                      if (!value) return true;
                      return /.+@.+\..+/.test(value) || 'Enter a valid e-mail address.';
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="hello@prolist.example" autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(+237) 222 123 456" autoComplete="tel" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cameroon" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bamenda" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Street, district, city" />
                    </FormControl>
                    <FormDescription>The full address is included on commercial invoices and certificates.</FormDescription>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!form.formState.isDirty || saveMutation.isPending}
                  className="min-w-[140px]"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Your logo appears in the navigation bar and exported documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/40 p-6 text-center shadow-sm">
            {data?.logoDataUrl ? (
              <img
                src={data.logoDataUrl}
                alt={`${data.name ?? 'Organisation'} logo`}
                className="mx-auto h-24 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">No logo uploaded yet</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />
          <Button onClick={handleLogoClick} variant="outline" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload logo
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or SVG up to 2 MB. Square logos sit best in the header.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
