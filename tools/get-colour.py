import sys
from colorthief import ColorThief

def main(image_path):
    color_thief = ColorThief(image_path)
    main_colour = color_thief.get_color(quality=1)
    return main_colour

if __name__ == "__main__":
    if len(sys.argv) == 2:
        print(main(sys.argv[1]))
    else:
        print("Usage: 'python get-color.py path/to/image'")
