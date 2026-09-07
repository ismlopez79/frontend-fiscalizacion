import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { loginTokens } from "./loginTokens";

type LoginFormOptionsProps = {
  remember: boolean;
  onRememberChange: (value: boolean) => void;
};

export function LoginFormOptions({ remember, onRememberChange }: LoginFormOptionsProps) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={0.5}>
      <FormControlLabel
        control={
          <Checkbox
            checked={remember}
            onChange={(e) => onRememberChange(e.target.checked)}
            size="small"
            sx={{
              color: loginTokens.borderHover,
              "&.Mui-checked": { color: loginTokens.navy },
            }}
          />
        }
        label={
          <Typography sx={{ fontSize: 14, color: "#1A1D21" }}>Recordarme</Typography>
        }
      />
      <Typography
        component="a"
        href="#"
        onClick={(e) => e.preventDefault()}
        sx={{
          fontSize: 14,
          fontWeight: 500,
          color: loginTokens.navy,
          textDecoration: "none",
          transition: `color 150ms ${loginTokens.ease}`,
          "&:hover": { color: loginTokens.gold },
        }}
      >
        ¿Olvidaste tu contraseña?
      </Typography>
    </Stack>
  );
}
