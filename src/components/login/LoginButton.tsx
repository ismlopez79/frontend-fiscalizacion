import { Button, CircularProgress } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { loginTokens } from "./loginTokens";

type LoginButtonProps = {
  loading: boolean;
  label?: string;
  loadingLabel?: string;
};

export function LoginButton({
  loading,
  label = "Ingresar",
  loadingLabel = "Iniciando sesión...",
}: LoginButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading}
      fullWidth
      disableElevation
      sx={{
        height: 56,
        borderRadius: "12px",
        backgroundColor: "#0D1B2A",
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: 700,
        textTransform: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        transition: `background-color 180ms ${loginTokens.ease}, transform 120ms ${loginTokens.ease}, box-shadow 180ms ${loginTokens.ease}`,
        "& .login-btn-arrow": {
          display: "flex",
          transition: `transform 180ms ${loginTokens.ease}`,
        },
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": {
            backgroundColor: loginTokens.navy,
            transform: "translateY(-2px)",
            boxShadow: "0 10px 24px rgba(13, 27, 42, 0.22)",
            "& .login-btn-arrow": {
              transform: "translateX(4px)",
            },
          },
        },
        "&:active": {
          transform: "scale(0.98)",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "&:hover": { transform: "none" },
          "&:active": { transform: "none" },
        },
        "&.Mui-disabled": {
          backgroundColor: "#0D1B2A",
          opacity: 0.6,
          color: "#FFFFFF",
        },
      }}
    >
      {loading ? (
        <>
          <CircularProgress size={18} thickness={5} sx={{ color: "#FFFFFF" }} />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <span className="login-btn-arrow">
            <ArrowForwardRoundedIcon fontSize="small" />
          </span>
        </>
      )}
    </Button>
  );
}
