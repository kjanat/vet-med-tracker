# Animal Switcher Component Improvements

## Current Issues

The `AnimalSwitcher` component in the header has several UX and visual issues:

1. **Always visible**: Takes up valuable header space even when animal context isn't needed
2. **Horizontal scrolling**: Awkward interaction pattern, especially on mobile
3. **Visual clutter**: Multiple badges and pills can be overwhelming
4. **Context confusion**: "All Animals" selection might not make sense on certain pages

## Proposed Solutions

### Option 1: Context-Aware Visibility
Only show the animal switcher on pages where animal context matters:
- Home (medication dashboard)
- Record medication
- History
- Regimens

Hide it on:
- Settings
- Inventory
- Insights (unless filtered by animal)

### Option 2: Dropdown/Select Pattern
Replace horizontal pills with a more compact dropdown:
```tsx
<Select value={selectedAnimal?.id || "all"} onValueChange={handleAnimalChange}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select animal">
      {selectedAnimal ? (
        <div className="flex items-center gap-2">
          <AnimalAvatar animal={selectedAnimal} size="xs" />
          <span>{selectedAnimal.name}</span>
          {selectedAnimal.pendingMeds > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {selectedAnimal.pendingMeds}
            </Badge>
          )}
        </div>
      ) : (
        <span>All Animals</span>
      )}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">
      <div className="flex items-center justify-between w-full">
        <span>All Animals</span>
        <Badge variant="secondary">
          {totalPendingMeds}
        </Badge>
      </div>
    </SelectItem>
    {animals.map((animal) => (
      <SelectItem key={animal.id} value={animal.id}>
        <div className="flex items-center gap-2 w-full">
          <AnimalAvatar animal={animal} size="xs" />
          <span>{animal.name}</span>
          {animal.pendingMeds > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {animal.pendingMeds}
            </Badge>
          )}
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Option 3: Move to Sidebar/Navigation
Instead of header placement:
- Desktop: Move to top of left sidebar
- Mobile: Move to a dedicated section in the mobile menu
- Or create a floating action button (FAB) for quick switching

### Option 4: Smart Context Detection
Automatically select the relevant animal based on the current page:
- On medication record page → Select animal with upcoming doses
- On history page → Maintain last viewed animal
- On regimen details → Select the regimen's animal

## Recommended Approach

**Phase 1: Quick Fix (30 minutes)**
1. Add context-aware visibility
2. Reduce visual weight (smaller badges, muted colors)
3. Add animation for smoother transitions

**Phase 2: Redesign (2 hours)**
1. Implement dropdown pattern for desktop
2. Keep pills for mobile but improve scrolling
3. Add keyboard navigation support
4. Store preference in localStorage

**Phase 3: Smart Features (2 hours)**
1. Auto-select based on context
2. Quick switch keyboard shortcut (Cmd+K)
3. Recent animals section
4. Search for many animals (10+)

## Implementation Priority

This should be addressed in **Phase 2: User Experience Polish** as part of the responsive design optimization, specifically under the "Design System Consistency" section.