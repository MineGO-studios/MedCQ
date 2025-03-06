# MedCQ Layout System

The MedCQ layout system provides a collection of components for building consistent page layouts across the application.

## Layout Component

The `Layout` component is the primary container for all pages in the application. It provides a consistent structure with header and footer.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | - | Page title to be set in document head |
| hideHeader | boolean | false | When true, the header will not be displayed |
| hideFooter | boolean | false | When true, the footer will not be displayed |
| className | string | '' | Additional CSS classes for the main content container |

### Example

```tsx
<Layout title="Dashboard">
  <Container>
    <h1>Dashboard</h1>
    <p>Welcome to your dashboard!</p>
  </Container>
</Layout>