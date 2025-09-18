"use client";

/**
 * Comprehensive demo showcasing all bulk selection features.
 * This component demonstrates various use cases and customization options.
 */

import { Archive, Plus, Search, Share } from "lucide-react";
import { useState } from "react";
import { BulkSelectionProvider } from "@/components/providers/bulk-selection-provider";
import { Badge } from "@/components/ui/badge";
import {
  type BulkSelectionColumn,
  BulkSelectionTable,
} from "@/components/ui/bulk-selection-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";
import { useToast } from "@/hooks/shared/use-toast";

// Demo data interfaces
interface DemoItem {
  id: string;
  name: string;
  category: "work" | "personal" | "urgent";
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  assignee: string;
  dueDate: Date;
  tags: string[];
}

// Sample data
const generateDemoData = (): DemoItem[] => [
  {
    assignee: "John Doe",
    category: "work",
    dueDate: new Date(2024, 2, 15),
    id: "1",
    name: "Review quarterly reports",
    priority: "high",
    status: "pending",
    tags: ["finance", "quarterly"],
  },
  {
    assignee: "Jane Smith",
    category: "work",
    dueDate: new Date(2024, 2, 20),
    id: "2",
    name: "Plan team retreat",
    priority: "medium",
    status: "in-progress",
    tags: ["team", "event"],
  },
  {
    assignee: "Mike Johnson",
    category: "personal",
    dueDate: new Date(2024, 2, 25),
    id: "3",
    name: "Update personal website",
    priority: "low",
    status: "pending",
    tags: ["web", "personal"],
  },
  {
    assignee: "Sarah Wilson",
    category: "urgent",
    dueDate: new Date(2024, 2, 10),
    id: "4",
    name: "Emergency security patch",
    priority: "high",
    status: "completed",
    tags: ["security", "urgent"],
  },
  {
    assignee: "David Brown",
    category: "work",
    dueDate: new Date(2024, 2, 18),
    id: "5",
    name: "Client presentation prep",
    priority: "high",
    status: "in-progress",
    tags: ["client", "presentation"],
  },
];

function BulkSelectionDemoContent() {
  const { toast } = useToast();
  const [data, setData] = useState<DemoItem[]>(generateDemoData());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomActions, setShowCustomActions] = useState(true);
  const [highlightSelected, setHighlightSelected] = useState(true);

  // Filter data based on search
  const filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  // Use bulk selection integration
  const { selectedItems, selectionCount } = useBulkSelectionIntegration({
    data: filteredData,
    getItemId: (item) => item.id,
    onSelectionChange: (selectedItems, _selectedIds) => {
      console.log("Selection changed:", {
        count: selectedItems.length,
        items: selectedItems,
      });
    },
  });

  // Define table columns
  const columns: BulkSelectionColumn<DemoItem>[] = [
    {
      key: "name",
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-muted-foreground text-sm">{item.assignee}</div>
        </div>
      ),
      title: "Task Name",
    },
    {
      key: "category",
      render: (item) => (
        <Badge
          variant={
            item.category === "urgent"
              ? "destructive"
              : item.category === "work"
                ? "default"
                : "secondary"
          }
        >
          {item.category}
        </Badge>
      ),
      title: "Category",
    },
    {
      key: "status",
      render: (item) => (
        <Badge
          variant={
            item.status === "completed"
              ? "default"
              : item.status === "in-progress"
                ? "secondary"
                : "outline"
          }
        >
          {item.status.replace("-", " ")}
        </Badge>
      ),
      title: "Status",
    },
    {
      key: "priority",
      render: (item) => (
        <Badge
          variant={
            item.priority === "high"
              ? "destructive"
              : item.priority === "medium"
                ? "secondary"
                : "outline"
          }
        >
          {item.priority}
        </Badge>
      ),
      title: "Priority",
    },
    {
      key: "dueDate",
      render: (item) => (
        <div className="text-sm">{item.dueDate.toLocaleDateString()}</div>
      ),
      title: "Due Date",
    },
    {
      key: "tags",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge className="text-xs" key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 2 && (
            <Badge className="text-xs" variant="outline">
              Number(){item.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
      title: "Tags",
    },
    {
      key: "actions",
      render: (item) => (
        <Button onClick={() => handleEdit(item)} size="sm" variant="outline">
          Edit
        </Button>
      ),
      title: "Actions",
    },
  ];

  // Action handlers
  const handleEdit = (item: DemoItem) => {
    toast({
      description: `Editing: ${item.name}`,
      title: "Edit Item",
    });
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    const selectedNames = selectedIds
      .map((id) => data.find((item) => item.id === id)?.name)
      .filter(Boolean);

    if (
      confirm(
        `Delete ${selectedIds.length} items?\n\n${selectedNames.join("\n")}`,
      )
    ) {
      setData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      toast({
        description: `Successfully deleted ${selectedIds.length} items`,
        title: "Items Deleted",
      });
    }
  };

  const handleBulkExport = (selectedIds: string[]) => {
    const selectedItems = data.filter((item) => selectedIds.includes(item.id));

    // Create CSV content
    const csvContent = [
      "Name,Category,Status,Priority,Assignee,Due Date,Tags",
      ...selectedItems.map((item) =>
        [
          `"${item.name}"`,
          item.category,
          item.status,
          item.priority,
          `"${item.assignee}"`,
          item.dueDate.toISOString().split("T")[0],
          `"${item.tags.join(", ")}"`,
        ].join(","),
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tasks-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      description: `Exported ${selectedIds.length} items to CSV`,
      title: "Export Complete",
    });
  };

  const handleBulkArchive = (selectedIds: string[]) => {
    setData((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, status: "completed" as const }
          : item,
      ),
    );
    toast({
      description: `Marked ${selectedIds.length} items as completed`,
      title: "Items Archived",
    });
  };

  const handleBulkShare = (selectedIds: string[]) => {
    const selectedNames = selectedIds
      .map((id) => data.find((item) => item.id === id)?.name)
      .filter(Boolean);

    toast({
      description: `Sharing ${selectedIds.length} items: ${selectedNames.slice(0, 2).join(", ")}${selectedNames.length > 2 ? "..." : ""}`,
      title: "Share Items",
    });
  };

  const addSampleItem = () => {
    const newItem: DemoItem = {
      assignee: "New User",
      category: "work",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      id: `${Date.now()}`,
      name: `New Task ${data.length + 1}`,
      priority: "medium",
      status: "pending",
      tags: ["new", "demo"],
    };
    setData((prev) => [...prev, newItem]);
    toast({
      description: `Added: ${newItem.name}`,
      title: "Item Added",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Selection Demo</CardTitle>
          <p className="text-muted-foreground">
            Interactive demo showcasing bulk selection features.
            {selectionCount > 0 && (
              <span className="ml-2 font-medium">
                ({selectionCount} selected)
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={showCustomActions}
                id="custom-actions"
                onCheckedChange={setShowCustomActions}
              />
              <Label htmlFor="custom-actions">Show Custom Actions</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={highlightSelected}
                id="highlight-selected"
                onCheckedChange={setHighlightSelected}
              />
              <Label htmlFor="highlight-selected">Highlight Selected</Label>
            </div>
            <Button className="gap-1" onClick={addSampleItem} size="sm">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              value={searchQuery}
            />
          </div>

          {/* Statistics */}
          <div className="flex gap-4 text-muted-foreground text-sm">
            <span>Total: {data.length}</span>
            <span>Visible: {filteredData.length}</span>
            <span>Selected: {selectionCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Selection Table */}
      <BulkSelectionTable
        columns={columns}
        customActions={
          showCustomActions
            ? [
                {
                  icon: Archive,
                  label: "Archive",
                  onClick: handleBulkArchive,
                  variant: "outline",
                },
                {
                  icon: Share,
                  label: "Share",
                  onClick: handleBulkShare,
                  variant: "secondary",
                },
              ]
            : undefined
        }
        data={filteredData}
        emptyMessage="No tasks found. Try adjusting your search."
        getItemId={(item) => item.id}
        getItemLabel={(item) => item.name}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        rowClassName={
          highlightSelected
            ? (_item, isSelected) =>
                isSelected ? "bg-primary/5 border-primary/20" : ""
            : undefined
        }
      />

      {/* Selection Info */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""} selected:
              </p>
              <div className="space-y-1">
                {selectedItems.slice(0, 3).map((item) => (
                  <div
                    className="flex items-center gap-2 text-sm"
                    key={item.id}
                  >
                    <Badge className="text-xs" variant="outline">
                      {item.category}
                    </Badge>
                    <span>{item.name}</span>
                  </div>
                ))}
                {selectedItems.length > 3 && (
                  <p className="text-muted-foreground text-sm">
                    ...and {selectedItems.length - 3} more
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function BulkSelectionDemo() {
  return (
    <BulkSelectionProvider>
      <BulkSelectionDemoContent />
    </BulkSelectionProvider>
  );
}
