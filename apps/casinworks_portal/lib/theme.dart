import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const cream = Color(0xFFECEBE7);
const panel = Color(0xFFF4F3F0);
const ink = Color(0xFF1A1A1A);
const slate = Color(0xFF64748B);
const slateMuted = Color(0xFF94A3B8);
const blocked = Color(0xFFBA593E);
const fairwaySand = Color(0xFFDDD6C6);
const errorRed = Color(0xFFB91C1C);
const hairline = Color(0x1A000000);
const fieldBorder = Color(0x26000000);

TextStyle get kickerStyle => GoogleFonts.dmSans(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 1.8,
      color: slate,
    );

TextStyle get brandStyle => GoogleFonts.dmSans(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      letterSpacing: 2.4,
      color: ink,
    );

TextStyle displayStyle([double size = 36]) => GoogleFonts.cormorantGaramond(
      fontSize: size,
      fontWeight: FontWeight.w600,
      height: 1.1,
      color: ink,
    );

TextStyle get bodyStyle => GoogleFonts.dmSans(
      fontSize: 14,
      height: 1.45,
      color: const Color(0xFF475569),
    );

ThemeData portalTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: cream,
    canvasColor: cream,
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    hoverColor: Colors.transparent,
    colorScheme: const ColorScheme.light(
      primary: ink,
      onPrimary: Colors.white,
      secondary: ink,
      onSecondary: Colors.white,
      surface: cream,
      onSurface: ink,
      error: errorRed,
      onError: Colors.white,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: ink),
    dividerColor: hairline,
    appBarTheme: AppBarTheme(
      backgroundColor: cream,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.dmSans(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: ink,
      ),
    ),
  );

  return base.copyWith(
    textTheme: GoogleFonts.dmSansTextTheme(base.textTheme).apply(
      bodyColor: ink,
      displayColor: ink,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: GoogleFonts.dmSans(fontSize: 14, color: slateMuted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: fieldBorder),
      ),
      enabledBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: fieldBorder),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: ink),
      ),
    ),
  );
}
