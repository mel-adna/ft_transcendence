# Frontend Issues & Feature Requirements


### 1. Google OAuth Multiple Initialization Warning

 - Warning

```text
client:87 [GSI_LOGGER]: google.accounts.id.initialize() is called multiple times. This could cause unexpected behavior and only the last initialized instance will be used.
```

The warning `[GSI_LOGGER]: google.accounts.id.initialize() is called multiple times`
happens because React triggers `useEffect`
twice in **Strict Mode** or on component re-renders, causing Google Identity Services to initialize repeatedly.

---

### 2. Recharts Layout Calculation Warning


- Warning

```text
The width(-1) and height(-1) of chart should be greater than 0... in StatsDashboard.jsx.
```

ResponsiveContainer attempts to calculate dimensions before the parent div completes CSS layout rendering.