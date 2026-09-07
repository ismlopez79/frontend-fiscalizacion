import { Button } from "@mui/material";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { loginTokens } from "./loginTokens";

export function TseButton() {
  return (
    <Button
      fullWidth
      startIcon={<VerifiedUserOutlinedIcon fontSize="small" />}
      sx={{
        height: 54,
        borderRadius: "12px",
        backgroundColor: "#FFFFFF",
        border: `1px solid ${loginTokens.borderIdle}`,
        color: loginTokens.navyDark,
        fontSize: 15,
        fontWeight: 600,
        textTransform: "none",
        transition: `background-color 150ms ${loginTokens.ease}, border-color 150ms ${loginTokens.ease}, transform 150ms ${loginTokens.ease}`,
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": {
            backgroundColor: "#F2F4F7",
            borderColor: loginTokens.navy,
            transform: "translateY(-1px)",
          },
        },
        "&:active": { transform: "scale(0.98)" },
        "@media (prefers-reduced-motion: reduce)": {
          "&:hover": { transform: "none" },
          "&:active": { transform: "none" },
        },
      }}
    >
      Iniciar sesión con TSE
    </Button>
  );
}
