import sys
from colorthief import ColorThief

def main(image_path):
    color_thief = ColorThief(image_path)
    palette = color_thief.get_palette(color_count=2)

    for colour_i in range(len(palette)):
        # Convert colour tuple into comma-seperated string
        palette[colour_i] = ','.join([str(value) for value in palette[colour_i]])

    # Return list converted into space-seperated string
    return ' '.join(palette)

if __name__ == "__main__":
    if len(sys.argv) == 2:
        print(main(sys.argv[1]))
    else:
        print("Usage: 'python get-bg-colours.py path/to/image'")
