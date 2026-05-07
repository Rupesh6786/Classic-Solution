
"use client";

import { useRef, useState, useEffect } from 'react';
import { ServiceBookingForm } from '@/components/ServiceBookingForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Wind, Pipette, Unplug, Settings, ThermometerSun, Cpu, Replace, PackagePlus, Cog, Loader2, Clock, IndianRupee } from 'lucide-react';
import type { Service } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, Unsubscribe, Timestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const IconMap: { [key: string]: React.ElementType } = {
  Wind,
  ThermometerSun,
  Pipette,
  Settings,
  Unplug,
  Wrench,
  Cpu,
  Replace,
  PackagePlus,
  Cog,
  Default: Wrench,
};

export function ServicesPageClient() {
  const bookingFormRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isLoggedIn, openAuthModal } = useAuth();
  const [selectedServiceForForm, setSelectedServiceForForm] = useState<string | undefined>(undefined);

  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const servicesColRef = collection(db, "services");
    // Query only by status to avoid needing a composite index. Sorting is done client-side.
    const q = query(servicesColRef, where("status", "==", "Active"));

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedServices: Service[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            // Ensure createdAt is a Date object for consistent sorting
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as Service;
        });

        // Sort the services on the client-side by creation date (ascending)
        fetchedServices.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
        });

        setServicesList(fetchedServices);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching services:", error);
        toast({
          title: "Error",
          description: "Could not fetch available services. " + error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);


  const handleServiceCardClick = (serviceName: string) => {
    if (!isLoggedIn) {
      openAuthModal('login');
      return;
    }
    setSelectedServiceForForm(serviceName);
    bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderPriceDisplay = (service: Service) => {
      if (service.minPrice && service.maxPrice) {
          return (
              <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4"/>
                  <span>{service.minPrice.toLocaleString()} - {service.maxPrice.toLocaleString()}</span>
              </div>
          );
      }
      if (service.price) {
          return (
              <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4"/>
                  <span>{service.price.toLocaleString()}</span>
              </div>
          );
      }
      return <div />;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-3xl sm:text-4xl font-semibold text-foreground mb-2">Our AC Services</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Reliable and professional AC services to keep you cool. Schedule your appointment today!
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading services...</p>
        </div>
      ) : servicesList.length === 0 ? (
        <div className="text-center py-20">
            <Wrench className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Services Available</h2>
            <p className="text-muted-foreground">There are currently no services available. Please check back later.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {servicesList.map(service => {
            const IconComponent = service.icon ? IconMap[service.icon] || IconMap.Default : IconMap.Default;
            
            return (
                <Card 
                key={service.id} 
                className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col"
                onClick={() => handleServiceCardClick(service.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleServiceCardClick(service.name);}}
                aria-label={`Select service: ${service.name}`}
                >
                <CardHeader>
                    <IconComponent className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="font-headline text-xl">{service.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription>{service.description}</CardDescription>
                </CardContent>
                <CardContent className="flex justify-between items-center text-sm text-accent font-medium pt-4">
                    {renderPriceDisplay(service)}
                     {service.duration && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4"/>
                            <span>{service.duration}</span>
                        </div>
                    )}
                </CardContent>
                </Card>
            );
            })}
        </div>
      )}

      <div ref={bookingFormRef} className="max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-xl scroll-mt-20">
        <h2 className="font-headline text-3xl font-semibold text-foreground mb-6 text-center">
          Book Your Service Appointment
        </h2>
        <ServiceBookingForm 
            availableServices={servicesList} 
            initialServiceType={selectedServiceForForm}
            key={selectedServiceForForm}
        />
      </div>
    </div>
  );
}
