# MedCQ UI Component Library

This document provides an overview of the core UI components implemented for the MedCQ application.

## Button

The `Button` component is used for actions in forms, dialogs, and more.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'link' | 'primary' | The visual style variant of the button |
| size | 'sm' \| 'md' \| 'lg' | 'md' | The size of the button |
| fullWidth | boolean | false | When true, the button will take up the full width of its container |
| isLoading | boolean | false | Shows loading spinner and disables button when true |
| leftIcon | ReactNode | - | Icon component to show before the button text |
| rightIcon | ReactNode | - | Icon component to show after the button text |

### Example

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Submit
</Button>

<Button variant="outline" isLoading>
  Loading...
</Button>

<Button
  variant="secondary"
  leftIcon={<IconComponent />}
  fullWidth
>
  With Icon
</Button>