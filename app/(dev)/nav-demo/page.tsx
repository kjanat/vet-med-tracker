"use client";

import { Code } from "lucide-react";
import { FormWithNavigationGuard } from "@/components/examples/form-with-navigation-guard";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NavigationDemoPage() {
	return (
		<div className="container mx-auto space-y-8 p-6">
			<div className="space-y-2">
				<h1 className="font-bold text-3xl tracking-tight">
					Next.js 15 Navigation Features Demo
				</h1>
				<p className="text-muted-foreground">
					Showcasing useSelectedLayoutSegment, useSelectedLayoutSegments,
					useLinkStatus, and onNavigate features
				</p>
			</div>

			<Tabs defaultValue="segment-detection" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="segment-detection">Segment Detection</TabsTrigger>
					<TabsTrigger value="loading-indicators">
						Loading Indicators
					</TabsTrigger>
					<TabsTrigger value="navigation-guard">Navigation Guard</TabsTrigger>
				</TabsList>

				<TabsContent value="segment-detection" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Layout Segment Detection</CardTitle>
							<CardDescription>
								Using useSelectedLayoutSegment and useSelectedLayoutSegments
								hooks
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="mb-2 font-semibold">Features Implemented:</h3>
								<ul className="space-y-2 text-sm">
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Automatic Active State:</strong> Navigation items
											automatically highlight based on the current route segment
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Breadcrumbs:</strong> Dynamic breadcrumb
											generation using useSelectedLayoutSegments
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Contextual Headers:</strong> Page headers change
											based on the current route
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Auto-Expanding Navigation:</strong> Collapsible
											menu items expand when their children are active
										</span>
									</li>
								</ul>
							</div>

							<div className="rounded-lg bg-muted p-4">
								<p className="mb-2 font-mono text-sm">
									<Code className="mr-2 inline h-4 w-4" />
									Example: NavMainItem component
								</p>
								<pre className="overflow-x-auto text-xs">
									{`const segment = useSelectedLayoutSegment();
const isActive = segment === itemSegment;`}
								</pre>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="loading-indicators" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Navigation Loading States</CardTitle>
							<CardDescription>
								Using pathname changes to detect navigation transitions
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="mb-2 font-semibold">Features Implemented:</h3>
								<ul className="space-y-2 text-sm">
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Loading Spinners:</strong> Automatic loading
											indicators for all navigation links
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Fade-in Animation:</strong> Smooth appearance with
											100ms delay to avoid flashing
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Accessibility:</strong> Proper ARIA labels and
											screen reader support
										</span>
									</li>
								</ul>
							</div>

							<div className="rounded-lg bg-muted p-4">
								<p className="mb-2 font-mono text-sm">
									<Code className="mr-2 inline h-4 w-4" />
									Example: LoadingIndicator component
								</p>
								<pre className="overflow-x-auto text-xs">
									{`const [isNavigating, setIsNavigating] = useState(false);
const pathname = usePathname();

useEffect(() => {
  setIsNavigating(true);
  const timer = setTimeout(() => setIsNavigating(false), 300);
  return () => clearTimeout(timer);
}, [pathname]);`}
								</pre>
							</div>

							<p className="text-muted-foreground text-sm">
								Try clicking any navigation link to see the loading indicator in
								action!
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="navigation-guard" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Navigation Guards</CardTitle>
							<CardDescription>
								Using the onNavigate prop to prevent navigation with unsaved
								changes
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="mb-2 font-semibold">Features Implemented:</h3>
								<ul className="space-y-2 text-sm">
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Form Protection:</strong> Prevents accidental
											navigation when forms have unsaved changes
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Browser Navigation:</strong> Also handles browser
											back/forward buttons
										</span>
									</li>
									<li className="flex items-start">
										<span className="mr-2">•</span>
										<span>
											<strong>Confirmation Dialogs:</strong> User-friendly
											prompts before leaving
										</span>
									</li>
								</ul>
							</div>

							<div className="rounded-lg border p-4">
								<h4 className="mb-3 font-semibold">Try it out:</h4>
								<FormWithNavigationGuard />
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
				<CardHeader>
					<CardTitle>Implementation Summary</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p>
						<strong>Refactored to shadcn breadcrumb component</strong> - Using
						the existing UI library for consistency
					</p>
					<p>
						<strong>Segment-based navigation</strong> - Replaced pathname
						matching with useSelectedLayoutSegment
					</p>
					<p>
						<strong>Loading indicators</strong> - Added pathname-based loading
						indicators for better UX during navigation
					</p>
					<p>
						<strong>Navigation guards</strong> - Implemented onNavigate for form
						protection
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
